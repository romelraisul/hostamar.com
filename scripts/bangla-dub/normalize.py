#!/usr/bin/env python3
"""Normalize a video for the TV concat playlist: 1280x720@25fps h264 + aac 44.1k stereo (adds silence if no audio).

Burns the HOSTAMAR.COM/TV channel watermark into every normalized video
(top-right corner) so all TV content carries branding even when re-hosted.
"""
import os, subprocess, sys, tempfile

WATERMARK_TEXT = os.environ.get("TV_WATERMARK_TEXT", "HOSTAMAR.COM/TV")
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf",
]

def _fontfile():
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    return None

def _watermark_filter():
    """drawtext top-right: x = w-tw-20 (right margin), y = 20 (top margin).

    ffmpeg filtergraph syntax: filter options are separated by ':',
    filters themselves by ','. Getting these mixed breaks the graph.
    """
    import re
    font = _fontfile()
    safe_text = re.sub(r"[^A-Za-z0-9 ./_-]", "", WATERMARK_TEXT) or "HOSTAMAR.TV"
    parts = []
    if font:
        parts.append("fontfile=" + font.replace("\\", "\\\\").replace(":", "\\:"))
    parts.append("text=" + safe_text)
    parts += [
        "fontcolor=white",
        "fontsize=28",
        "box=1",
        "boxcolor=black@0.45",
        "boxborderw=8",
        "x=w-tw-20",
        "y=20",
    ]
    return "drawtext=" + ":".join(parts)

VFI = ("scale=1280:720:force_original_aspect_ratio=decrease,"
       "pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p,"
       + _watermark_filter())
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-b:v", "2500k", "-maxrate", "2500k",
       "-bufsize", "5000k", "-g", "50", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2"]

def has_audio(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0",
                        "-show_entries", "stream=codec_name", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())

def normalize(src, dst):
    tmp = tempfile.mktemp(suffix=".mp4", dir=os.path.dirname(dst) or ".")
    if has_audio(src):
        cmd = ["ffmpeg", "-y", "-i", src, "-filter_complex",
               f"[0:v]{VFI}[v];[0:a]aresample=44100,aformat=channel_layouts=stereo[a]",
               "-map", "[v]", "-map", "[a]"] + ENC + [tmp]
    else:
        cmd = ["ffmpeg", "-y", "-i", src, "-f", "lavfi", "-i",
               "anullsrc=channel_layout=stereo:sample_rate=44100", "-filter_complex",
               f"[0:v]{VFI}[v]", "-map", "[v]", "-map", "1:a", "-shortest"] + ENC + [tmp]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
    if r.returncode != 0:
        try: os.remove(tmp)
        except OSError: pass
        raise RuntimeError(r.stderr[-300:])
    os.replace(tmp, dst)
    return dst

if __name__ == "__main__":
    print(normalize(sys.argv[1], sys.argv[2]))
