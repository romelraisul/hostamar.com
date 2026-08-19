#!/usr/bin/env python3
"""Generate celebration audio - just two nice tones."""
import subprocess, os

OUT_DIR = os.path.expanduser("~/hostamar-build/video-output")
os.makedirs(OUT_DIR, exist_ok=True)

# Tone 1: warm pad (A4 440Hz with vibrato)
subprocess.run([
    "ffmpeg", "-y",
    "-f", "lavfi",
    "-i", "aevalsrc=0.5*sin(2*PI*440*t + 0.3*sin(2*PI*5*t))*exp(-t/10):c=stereo:s=44100:d=10",
    os.path.join(OUT_DIR, "pad.wav")
], capture_output=True, timeout=10)

# Tone 2: higher melody (E5 660Hz)
subprocess.run([
    "ffmpeg", "-y",
    "-i", os.path.join(OUT_DIR, "pad.wav"),
    "-af", "aeval=0.4*sin(2*PI*660*t)*exp(-t/6) + 0.3*sin(2*PI*880*t)*exp(-((t-4)*(t-4))/6):c=stereo",
    os.path.join(OUT_DIR, "melody.wav")
], capture_output=True, timeout=10)

# Mix: pad + melody
subprocess.run([
    "ffmpeg", "-y",
    "-i", os.path.join(OUT_DIR, "pad.wav"),
    "-i", os.path.join(OUT_DIR, "melody.wav"),
    "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.7",
    os.path.join(OUT_DIR, "celebration_audio.wav")
], capture_output=True, timeout=10)

final = os.path.join(OUT_DIR, "celebration_audio.wav")
if os.path.exists(final):
    print(f"Audio ready: {os.path.getsize(final)} bytes at {final}")
else:
    # Absolute fallback: just copy the pad
    import shutil
    shutil.copy(os.path.join(OUT_DIR, "pad.wav"), final)
    print("Fallback audio used")

# Cleanup
for f in ["pad.wav", "melody.wav"]:
    try: os.remove(os.path.join(OUT_DIR, f))
    except: pass
