"""Bangla dub pipeline: ffmpeg audio -> faster-whisper EN -> Google translate bn -> edge-tts -> mux.

Gender-aware TTS: detects the source speaker's gender (gender_detect.py) and
picks bn-BD-PradeepNeural (male) or bn-BD-NabanitaNeural (female) accordingly.
"""
import asyncio, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gender_detect import detect_gender

DEFAULT_VOICE = os.environ.get("BANGLA_VOICE", "bn-BD-PradeepNeural")
GENDER_AWARE = os.environ.get("TV_GENDER_VOICE", "1") != "0"
INTRO_TMPL = "আসসালামু আলাইকুম। হোস্টামার টিভিতে আপনাকে স্বাগতম। এখন দেখুন: {title_bn}। সূত্র: {source}, {license}। আমরা এই ভিডিওটি আপনাদের জন্য বাংলায় উপস্থাপন করছি।"

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=kw.pop("timeout", 1800), **kw)

def ffprobe_duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    try:
        return float(r.stdout.strip())
    except Exception:
        return None

def _is_h264(path):
    """True when the video stream can be stream-copied into MP4 (h264)."""
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_name", "-of", "csv=p=0", path])
    return r.stdout.strip().lower() == "h264"

def extract_audio(video, wav):
    r = run(["ffmpeg", "-y", "-i", video, "-ac", "1", "-ar", "16000", wav])
    return r.returncode == 0

def transcribe(wav):
    """EN transcript (list of segment texts) via faster-whisper small/int8."""
    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
    segments, info = model.transcribe(wav, language="en", vad_filter=True)
    return [s.text.strip() for s in segments if s.text.strip()]

def translate_en_bn(text):
    from deep_translator import GoogleTranslator
    out, t = [], GoogleTranslator(source="en", target="bn")
    # batch under 4500 chars
    while text:
        chunk, text = text[:4500], text[4500:]
        for _ in range(3):
            try:
                out.append(t.translate(chunk)); break
            except Exception:
                time.sleep(2)
        else:
            out.append(chunk)
    return "".join(out)

def tts_bangla(text, mp3_path, voice=None):
    import edge_tts
    voice = voice or DEFAULT_VOICE
    async def _go():
        await edge_tts.Communicate(text, voice, rate="+8%").save(mp3_path)
    asyncio.run(_go())
    return os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 1000

def atempo_chain(rate):
    """Build atempo filter for rate in (0.5, 2.0+] clamped sensibly."""
    rate = max(0.5, min(rate, 2.0))
    parts = []
    while rate > 2.0:
        parts.append("atempo=2.0"); rate /= 2.0
    while rate < 0.5:
        parts.append("atempo=0.5"); rate /= 0.5
    parts.append(f"atempo={rate:.4f}")
    return ",".join(parts)

def dub_video(src, dst, title_bn, source, license_, tmp="/tmp"):
    base = os.path.splitext(os.path.basename(src))[0]
    wav = os.path.join(tmp, base + ".wav")
    mp3 = os.path.join(tmp, base + "_bn.mp3")
    # Gender-aware voice: match the Bangla narrator to the original speaker.
    gender = "male"
    voice = DEFAULT_VOICE
    gmethod = "default"
    if GENDER_AWARE:
        try:
            g = detect_gender(src, title_bn)
            gender, voice, gmethod = g["gender"], g["voice"], g["method"]
            print(f"gender detection: {gender} via {gmethod} ({g.get('detail', '')})", flush=True)
        except Exception as e:
            print(f"gender detection failed ({e}); defaulting male", file=sys.stderr)
    if not extract_audio(src, wav):
        raise RuntimeError("audio extract failed")
    try:
        segs = transcribe(wav)
    except Exception as e:
        print(f"whisper failed ({e}); using title-only narration", file=sys.stderr)
        segs = []
    en_text = " ".join(segs).strip()
    if len(en_text) < 40:
        # silent/music-only video: narrate from source+license context only
        en_text = ""
    intro = INTRO_TMPL.format(title_bn=title_bn, source=source, license=license_)
    bn_body = translate_en_bn(en_text) if en_text else ""
    bn_text = (intro + " " + bn_body).strip()
    if not tts_bangla(bn_text, mp3, voice):
        raise RuntimeError("tts failed")
    vid_dur = ffprobe_duration(src) or 60.0
    tts_dur = ffprobe_duration(mp3) or (vid_dur * 0.8)
    # We slow/speed TTS to spread narration across the whole video; long silences at end are fine (apad).
    target = min(tts_dur * 1.15, vid_dur)   # leave a little breathing room, never exceed video
    rate = tts_dur / target if target > 0 else 1.0
    afilter = f"[1:a]aresample=44100,{atempo_chain(rate)},apad,atrim=0:{vid_dur:.2f}[a]"
    raw = dst + ".raw.mp4"
    vcodec = "copy" if _is_h264(src) else "libx264"  # theora/mpeg4/etc must be re-encoded
    r = run(["ffmpeg", "-y", "-i", src, "-i", mp3,
             "-filter_complex", afilter, "-map", "0:v:0", "-map", "[a]",
             "-c:v", vcodec, *(["-preset", "veryfast"] if vcodec != "copy" else []),
             "-c:a", "aac", "-b:a", "128k", "-shortest",
             "-metadata", f"comment=Source: {source} | {license_}", raw], timeout=3600)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg mux failed: " + r.stderr[-400:])
    try:
        from normalize import normalize as _norm
        _norm(raw, dst)
    finally:
        try: os.remove(raw)
        except OSError: pass
    r = type("R", (), {"returncode": 0, "stderr": ""})()
    for p in (wav, mp3):
        try: os.remove(p)
        except OSError: pass
    if r.returncode != 0:
        raise RuntimeError("ffmpeg mux failed: " + r.stderr[-400:])
    return {"en_segments": len(segs), "tts_seconds": round(tts_dur, 1),
            "video_seconds": round(vid_dur, 1), "voice": voice,
            "gender": gender, "gender_method": gmethod}

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    print(json.dumps(dub_video(src, dst, os.path.basename(dst), "TV", "PD"), ensure_ascii=False))
