#!/usr/bin/env python3
"""Detect a true audio LOOP bug: a short clip (0.5-3s) repeated back-to-back.

Method: for each candidate loop length L, compute normalized cross-correlation
between consecutive segments x[i:i+L] and x[i+L:i+2L]. A genuine loop gives
corr ~1.0; natural speech/music gives <0.9. This avoids the false positives of
energy-envelope autocorrelation (tremolo music / speech cadence).
"""
import subprocess, sys, struct, os, math

def get_audio(path, rate=16000):
    p = subprocess.run(['ffmpeg','-v','error','-i',path,'-vn','-ac','1','-ar',str(rate),'-f','s16le','-'],
                       capture_output=True, timeout=60)
    raw = p.stdout
    n = len(raw)//2
    return struct.unpack(f'<{n}h', raw[:n*2]), rate

def norm_corr(a, b):
    n = min(len(a), len(b))
    if n < 100: return 0.0
    a, b = a[:n], b[:n]
    ma = sum(a)/n; mb = sum(b)/n
    num = sum((a[i]-ma)*(b[i]-mb) for i in range(n))
    da = math.sqrt(sum((x-ma)**2 for x in a))
    db = math.sqrt(sum((x-mb)**2 for x in b))
    if da == 0 or db == 0: return 0.0
    return num/(da*db)

def detect_loop(path, thresh=0.92):
    samples, rate = get_audio(path)
    dur = len(samples)/rate
    if dur < 3:
        return {'file': os.path.basename(path), 'dur_s': round(dur,1), 'loop': False, 'reason':'too short'}
    best = None
    # candidate loop lengths 0.5s..3s in 0.1s steps
    L10 = int(rate*0.1)
    for Lq in range(5, 31):  # 0.5s..3.0s
        L = Lq*L10
        if 3*L > len(samples): break
        # sample several positions
        corrs = []
        step = max(1, L//2)
        i = 0
        while i + 2*L <= len(samples) and len(corrs) < 6:
            corrs.append(norm_corr(samples[i:i+L], samples[i+L:i+2*L]))
            i += step
        if not corrs: continue
        avg = sum(corrs)/len(corrs)
        if best is None or avg > best[1]:
            best = (Lq*0.1, avg)
    if best and best[1] >= thresh:
        return {'file': os.path.basename(path), 'dur_s': round(dur,1), 'loop': True,
                'loop_len_s': best[0], 'corr': round(best[1],3)}
    return {'file': os.path.basename(path), 'dur_s': round(dur,1), 'loop': False,
            'corr': round(best[1],3) if best else 0}

if __name__ == '__main__':
    for f in sys.argv[1:]:
        r = detect_loop(f)
        flag = 'LOOP-BUG' if r.get('loop') else 'ok'
        extra = f"loop_len={r.get('loop_len_s')}s corr={r.get('corr')}" if r.get('loop') else f"max_corr={r.get('corr',0)}"
        print(f"[{flag}] {r['file']} dur={r['dur_s']}s {extra}")
