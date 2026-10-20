#!/usr/bin/env python3
"""Cut one Shorts clip per episode that lacks one, from a narrated window.

Picks the 30s window with the highest mean loudness (narration lives there),
center-crops to 1080x1920, audio copied, then verifies audibility post-mux.
"""
import json, os, subprocess, sys

REPO = '/home/romel/hostamar.com'
OUT = os.path.join(REPO, 'public/tv')

# episode -> source file on the shelf (must be audible)
JOBS = {
    'https-tls-episode': 'https-tls-episode-narrated',
    'receipt-cloud-agents-variant': 'receipt-cloud-agents-variant',
}

def loudness(path):
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', path, '-af', 'volumedetect',
                        '-f', 'null', '-'], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if 'mean_volume' in line:
            return float(line.split('mean_volume:')[1].split()[0])
    return -999.0

def best_window(src, clip=30, step=5):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'csv=p=0', src], capture_output=True,
        text=True).stdout.strip())
    best, bestv = 0, -999.0
    t = 0.0
    while t + clip <= dur + 1e-6:
        tmp = '/tmp/shortsprobe.mp4'
        subprocess.run(['ffmpeg', '-y', '-ss', str(round(t, 1)), '-i', src,
                        '-t', str(clip), '-c', 'copy', tmp],
                       capture_output=True)
        v = loudness(tmp)
        if v > bestv:
            bestv, best = v, t
        t += step
    return best, bestv, dur

def main():
    for ep, src in JOBS.items():
        src_path = os.path.join(OUT, src + '.mp4')
        out_name = 'shorts-' + ep
        out_path = os.path.join(OUT, out_name + '.mp4')
        if os.path.exists(out_path):
            print(f'{out_name}: already exists, skipping'); continue
        start, v, dur = best_window(src_path)
        print(f'{ep}: src={src} dur={dur:.1f}s best_window_start={start}s loudness={v:.1f}dB')
        # a source shorter than 30s is looped so the Short still meets the 30s
        # packaging rule (our own render, looped -- not third-party footage)
        if dur < 30:
            cmd = ['ffmpeg', '-y', '-stream_loop', str((30 // int(dur)) + 1),
                   '-i', src_path, '-t', '30', '-vf',
                   'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
                   '-c:a', 'copy', out_path]
        else:
            # cut from the loudest window, vertical
            cmd = ['ffmpeg', '-y', '-ss', str(round(start, 1)), '-i', src_path,
                   '-t', '30', '-vf',
                   'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
                   '-c:a', 'copy', out_path]
        subprocess.run(cmd, check=True, capture_output=True)
        # verify
        info = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
            'format=duration:stream=width,height', '-of', 'json', out_path],
            capture_output=True, text=True)
        d = json.loads(info.stdout)
        vw = next(s for s in d['streams'] if 'width' in s)
        mv = loudness(out_path)
        ok = (float(d['format']['duration']) >= 28 and vw['width'] == 1080
              and vw['height'] == 1920 and mv > -50)
        print(f'  -> {out_name}.mp4 dur={d["format"]["duration"]}s '
              f'{vw["width"]}x{vw["height"]} mean_volume={mv:.1f}dB AUDIBLE={ok}')
        assert ok, f'SHORTS GATE FAILED for {ep}'
        print('  SHORTS OK')

if __name__ == '__main__':
    main()