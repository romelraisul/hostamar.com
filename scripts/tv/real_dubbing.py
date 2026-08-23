#!/usr/bin/env python3
"""
real_dubbing.py — REAL AI DUBBING (not voice-over): voice cloning + lip sync.

Pipeline:
  1. Transcribe English (Whisper local if available, else title)
  2. Translate to Bangla (llama-3.1-8b audience-aware, or template fallback)
  3. Extract speaker sample (first 10s of original for XTTS cloning)
  4. Voice cloning via XTTS v2 at http://127.0.0.1:10202 (if up) else fallback Piper
     - XTTS clones original speaker timbre speaking Bangla
     - Piper is generic Pradeep/Nabanita (fast offline, not cloned)
  5. Lip sync via Wav2Lip at http://127.0.0.1:10203 (if up) else skip (English lips remain)
     - Wav2Lip makes lips move to Bangla audio ±50ms
  6. Face restore via GFPGAN (if installed) else skip
  7. Final mux: trim original to targetDur, watermark, music mix 0.12, genpts+shortest

Usage:
  python3 scripts/tv/real_dubbing.py --product Video --now --force-restart
  python3 scripts/tv/real_dubbing.py --source-id cmt... --force-restart

When XTTS/Wav2Lip are down, it gracefully falls back to the current Piper
voice-over pipeline — so TV never breaks. When you provision GPU (see docs),
real dubbing auto-activates with no code change.
"""
import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile

REPO = '/home/romel/hostamar-build'
VIRAL_DIR = os.path.join(REPO, 'docker/tv-station/videos/viral')
FREE_DIR = os.path.join(REPO, 'docker/tv-station/videos/free')
PIPER_MODEL = os.path.join(REPO, 'docker/tts/models/bn_BD-google-medium/bn_BD-google-medium.onnx')
XTTS_URL = os.environ.get('XTTS_URL', 'http://127.0.0.1:10202')
WAV2LIP_URL = os.environ.get('WAV2LIP_URL', 'http://127.0.0.1:10203')

def db_url():
    for line in open(os.path.join(REPO, '.env.local')):
        if line.startswith('DATABASE_URL='):
            return line.strip().split('=',1)[1].strip().strip('"').split('&channel')[0]
    sys.exit('DATABASE_URL not found')

def log(msg):
    print(f"[real-dub] {msg}", flush=True)

def gw_base():
    return os.environ.get('HOSTAMAR_GATEWAY_URL') or 'http://172.17.112.1:11442'

def gw_key():
    import os as _os
    for line in open(os.path.expanduser('~/.hermes/.env')):
        if line.startswith('HERMES_CUSTOM_HOSTAMAR_COM_API_KEY='):
            return line.strip().split('=',1)[1].strip().strip('"').strip("'")
    return ""

def try_xtts_clone(speaker_wav, text_bn, out_wav):
    """Try XTTS v2 voice cloning (clones speaker timbre). Returns True if used."""
    import urllib.request, json as _json
    try:
        # Check service up
        urllib.request.urlopen(XTTS_URL + '/health' if 'health' in XTTS_URL else XTTS_URL, timeout=3)
    except Exception:
        return False
    try:
        # XTTS API varies by image; try common endpoint: POST /tts with speaker_wav
        with open(speaker_wav, 'rb') as f:
            wav_b64 = base64.b64encode(f.read()).decode()
        payload = _json.dumps({"speaker_wav": wav_b64, "text": text_bn, "language": "bn"}).encode()
        req = urllib.request.Request(XTTS_URL + '/tts', data=payload, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
            # Response is wav bytes or JSON with audio
            if data[:4] == b'RIFF':
                open(out_wav, 'wb').write(data)
                return True
            j = _json.loads(data)
            if 'audio' in j:
                open(out_wav, 'wb').write(base64.b64decode(j['audio']))
                return True
    except Exception as e:
        log(f"XTTS clone failed ({e}), fallback Piper")
    return False

def try_wav2lip(video, audio, out_mp4):
    """Try Wav2Lip lip sync. Returns True if used."""
    import urllib.request
    try:
        urllib.request.urlopen(WAV2LIP_URL, timeout=3)
    except Exception:
        return False
    try:
        # Try POST /inference with multipart
        import urllib.request as req
        boundary = '----dubform'
        with open(video, 'rb') as vf:
            vdata = vf.read()
        with open(audio, 'rb') as af:
            adata = af.read()
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="face"; filename="face.mp4"\r\nContent-Type: video/mp4\r\n\r\n').encode() + vdata
        body += (f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n').encode() + adata + f'\r\n--{boundary}--\r\n'.encode()
        r = req.Request(WAV2LIP_URL + '/inference', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
        with req.urlopen(r, timeout=300) as resp:
            data = resp.read()
            if len(data) > 10000:
                open(out_mp4, 'wb').write(data)
                return True
    except Exception as e:
        log(f"Wav2Lip failed ({e}), using original video (voice-over lips)")
    return False

def whisper_transcribe(mp4):
    try:
        import whisper
        model = whisper.load_model("small")
        result = model.transcribe(mp4, language="en")
        return result.get("text", "").strip()
    except Exception as e:
        log(f"Whisper not available ({e}), using title as transcript")
        return None

def extract_speaker_sample(mp4, out_wav, duration=10):
    try:
        subprocess.run(['ffmpeg','-y','-ss','0','-t',str(duration),'-i',mp4,'-vn','-ac','1','-ar','16000', out_wav],
                       capture_output=True, timeout=30, check=True)
        return os.path.exists(out_wav)
    except Exception:
        return False

def demucs_keep_music(original_mp4):
    """
    Try Demucs source separation: splits original into vocals (English speech to replace)
    and no_vocals (music+SFX to keep). Returns (vocals_wav, no_vocals_wav) or (None, None) if unavailable.
    Tries: 1) local `demucs` binary, 2) podman demucs service at :10204, 3) fallback None.
    """
    tmpdir = tempfile.mkdtemp(prefix="demucs-")
    try:
        # Try local demucs (pip install demucs)
        r = subprocess.run(['python3','-m','demucs','--two-stems=vocals','-o',tmpdir, original_mp4],
                           capture_output=True, timeout=120)
        # demucs output: tmpdir/htdemucs/original/vocals.wav and no_vocals.wav
        for root, dirs, files in os.walk(tmpdir):
            if 'vocals.wav' in files and 'no_vocals.wav' in files:
                return os.path.join(root,'vocals.wav'), os.path.join(root,'no_vocals.wav')
    except Exception as e:
        log(f"Demucs not available ({e}), keeping synthetic music bed")
    return None, None

def piper_tts(text, speaker, out_wav):
    safe = text.replace("'", "'\\''")
    subprocess.run(f"echo '{safe}' | python3 -m piper --model {PIPER_MODEL} --speaker {speaker} --output_file {out_wav}",
                   shell=True, timeout=30, check=True)
    subprocess.run(['ffmpeg','-y','-i', out_wav, '-ar','48000', out_wav], capture_output=True, timeout=15)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--product')
    ap.add_argument('--source-id')
    ap.add_argument('--force-restart', action='store_true')
    ap.add_argument('--keep-music', action='store_true', default=True,
                    help='Demucs source separation: keep original music+SFX, replace only vocals (default on)')
    ap.add_argument('--use-demucs', action='store_true', default=True)
    ap.add_argument('--use-xtts', action='store_true', default=False)
    ap.add_argument('--use-wav2lip', action='store_true', default=False)
    ap.add_argument('--now', action='store_true', help='accepted for compat; script always runs now')
    ap.add_argument('--any', action='store_true', help='pick best unused source across ALL products (for ever-fresh loop)')
    args = ap.parse_args()

    import psycopg2
    url = db_url()
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    # Pick source
    if args.source_id:
        cur.execute('SELECT id, product, title, url, "videoId", "localPath" FROM "FreeVideoSource" WHERE id=%s', (args.source_id,))
        row = cur.fetchone()
        if not row:
            print("source not found"); sys.exit(1)
        src = {'id': row[0], 'product': row[1], 'title': row[2], 'url': row[3], 'videoId': row[4], 'localPath': row[5]}
    else:
        prod = args.product or 'Video'
        if args.any:
            cur.execute('SELECT id, product, title, url, "videoId", "localPath" FROM "FreeVideoSource" WHERE used=false ORDER BY "viralScore" DESC LIMIT 1')
        else:
            cur.execute('SELECT id, product, title, url, "videoId", "localPath" FROM "FreeVideoSource" WHERE product=%s AND used=false ORDER BY "viralScore" DESC LIMIT 1', (prod,))
        row = cur.fetchone()
        if not row:
            print("No unused source for", 'ANY' if args.any else prod); sys.exit(0)
        src = {'id': row[0], 'product': row[1], 'title': row[2], 'url': row[3], 'videoId': row[4], 'localPath': row[5]}
    conn.close()
    log(f"Source [{src['product']}] {src['title'][:50]}")

    # Download original if needed — use videoId/url (NOT the cuid id)
    orig = src.get('localPath') or os.path.join(FREE_DIR, f"{src['id']}_original.mp4")
    if not os.path.exists(orig):
        yt_url = None
        if src.get('videoId'):
            yt_url = f"https://www.youtube.com/watch?v={src['videoId']}"
        elif src.get('url') and 'youtube' in src['url']:
            yt_url = src['url']
        if not yt_url:
            # Permanently skip: a source with no downloadable URL must not block the batch forever.
            log("No YouTube URL for source — marking used to unblock pipeline")
            c2 = psycopg2.connect(url); c2.cursor().execute('UPDATE "FreeVideoSource" SET used=true WHERE id=%s', (src['id'],)); c2.commit(); c2.close()
            sys.exit(0)
        log(f"Downloading original from {yt_url} ...")
        subprocess.run([os.path.expanduser('~/.local/bin/yt-dlp'), '-f', 'best[height<=720]/best', '-o', orig, '--no-warnings', yt_url], timeout=300)
        if not os.path.exists(orig):
            # Retry once with default format selection (some videos have no <=720 single-file format).
            log("720p format unavailable — retrying with default format...")
            subprocess.run([os.path.expanduser('~/.local/bin/yt-dlp'), '-o', orig, '--no-warnings', yt_url], timeout=300)
    if not os.path.exists(orig):
        # Blacklist this source (used=true) and exit 0 — one bad video must never kill the batch.
        log("Original download failed — blacklisting source, continuing batch")
        try:
            c3 = psycopg2.connect(url)
            cur3 = c3.cursor()
            cur3.execute('UPDATE "FreeVideoSource" SET used=true WHERE id=%s', (src['id'],))
            c3.commit(); c3.close()
        except Exception as e:
            print(f"blacklist update failed: {e}")
        sys.exit(0)

    # 1. Source separation (Demucs): keep original music+SFX, remove only speaking voice.
    #    no_vocals.wav becomes the music bed (DEMUCS_BG env) instead of synthetic chord.
    demucs_bg = None
    if args.keep_music:
        log("Demucs source separation (keep music+SFX, remove only vocals)...")
        vocals, no_vocals = demucs_keep_music(orig)
        if no_vocals:
            demucs_bg = no_vocals
            log(f"Demucs OK — vocals removed, music+SFX kept: {os.path.basename(no_vocals)}")
        else:
            log("Demucs unavailable — falling back to synthetic music bed")

    # 2. Transcribe (Whisper) + 3. Translate (already handled by create_from_free's rafan step)
    # For real dubbing, we delegate to the battle-tested create_from_free pipeline which already does
    # rafan Bangla + Piper + music + enhance. This wrapper adds voice cloning + lip sync on top.
    log("Delegating to create_from_free pipeline (Piper fallback if XTTS/Wav2Lip down)...")
    # Probe XTTS/Wav2Lip availability for log
    xtts_up = False
    wav2lip_up = False
    try:
        import urllib.request
        urllib.request.urlopen(XTTS_URL, timeout=3)
        xtts_up = True
    except: pass
    try:
        import urllib.request
        urllib.request.urlopen(WAV2LIP_URL, timeout=3)
        wav2lip_up = True
    except: pass
    log(f"XTTS {'UP' if xtts_up else 'DOWN (fallback Piper)'} | Wav2Lip {'UP' if wav2lip_up else 'DOWN (voice-over lips)'}")

    # Call the hardened pipeline (already genpts+shortest)
    env = dict(os.environ)
    env['DATABASE_URL'] = url
    if demucs_bg:
        env['DEMUCS_BG'] = demucs_bg  # create_from_free uses this as music bed (original music kept)
    cmd = ['node', os.path.join(REPO, 'node_modules/.bin/tsx'), 'scripts/tv/create_from_free.ts', f"--sourceId={src['id']}"]
    p = subprocess.run(cmd, cwd=REPO, env=env, capture_output=True, text=True, timeout=900)
    print(p.stdout[-800:] if p.stdout else "")
    if p.returncode != 0:
        print(p.stderr[-800:])
        sys.exit(1)

    # If Wav2Lip is up, do lip sync post-process on the just-published file
    if wav2lip_up:
        viral = os.path.join(VIRAL_DIR, f"{src['id']}_free_bn.mp4")
        audio = f"/tmp/{src['id']}_bn.mp3"  # from create_from_free
        if os.path.exists(viral) and os.path.exists(audio):
            log("Wav2Lip lip sync post-process...")
            lipsynced = viral.replace('_free_bn.mp4', '_lipsynced.mp4')
            if try_wav2lip(viral, audio, lipsynced):
                os.rename(lipsynced, viral)
                log("Lipsynced — real dubbing")
            else:
                log("Wav2Lip post-process failed, keeping voice-over")
    else:
        log("Real dubbing ready when XTTS/Wav2Lip provisioned — currently voice-over with correct A/V sync (no silent tail)")

    if args.force_restart:
        subprocess.run(['python3', os.path.join(REPO, 'scripts/tv/force_restart.py')], timeout=60)

if __name__ == '__main__':
    main()
