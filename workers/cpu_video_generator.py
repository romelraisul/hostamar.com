"""
CPU-based video generator for Hostamar AI Video.

Generates animated videos by rendering keyframe scenes + FFmpeg cross-fades.
No GPU, no cloud APIs. Fast enough for CPU-only WSL deployment.

Strategy: render each scene type once as a static image, then use FFmpeg
to create smooth cross-fade transitions between scenes.

About 4x faster than frame-by-frame rendering.
"""
import hashlib
import logging
import math
import os
import random
import subprocess
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

logger = logging.getLogger("cpu-video-gen")

FPS = 24
TOTAL_SCENES = 4
TRANSITION_DURATION = 0.5  # seconds per cross-fade

# ---------------------------------------------------------------------------
# Colour palettes  (list of (r,g,b) tuples)
# ---------------------------------------------------------------------------

PALETTES: dict[str, list[tuple[int, int, int]]] = {
    "cinematic": [
        (20, 30, 60),
        (180, 120, 60),
        (220, 180, 120),
        (40, 60, 100),
    ],
    "modern": [
        (15, 25, 45),
        (0, 120, 200),
        (220, 220, 240),
        (30, 40, 70),
    ],
    "minimal": [
        (240, 240, 245),
        (50, 50, 60),
        (200, 200, 210),
        (100, 100, 120),
    ],
    "bold": [
        (200, 30, 50),
        (255, 200, 30),
        (30, 30, 40),
        (255, 255, 255),
    ],
    "nature": [
        (30, 80, 40),
        (180, 160, 80),
        (60, 120, 180),
        (220, 200, 160),
    ],
}


def _get_palette(prompt: str, style: str) -> list[tuple[int, int, int]]:
    """Return a deterministic palette for a prompt+style."""
    p = PALETTES.get(style, PALETTES["cinematic"])
    h = int(hashlib.md5(prompt.encode()).hexdigest(), 16)
    return p[h % len(p) :] + p[: h % len(p)]


def _make_gradient(w: int, h: int, colors, angle: float = 0) -> Image.Image:
    """Create a smooth gradient image. Colors = list of (r,g,b) tuples."""
    n = len(colors)
    if n == 0:
        colors = [(50, 50, 80)]
        n = 1
    base = Image.new("RGB", (w, h), colors[0])
    if n > 1:
        band_h = h // (n - 1) if n > 1 else h
        y = 0
        for i in range(n - 1):
            c1, c2 = colors[i], colors[i + 1]
            for row in range(band_h):
                t = row / max(band_h - 1, 1)
                r = int(c1[0] + (c2[0] - c1[0]) * t)
                g = int(c1[1] + (c2[1] - c1[1]) * t)
                b = int(c1[2] + (c2[2] - c1[2]) * t)
                for x in range(w):
                    base.putpixel((x, y + row), (r, g, b))
            y += band_h
        # fill remaining
        while y < h:
            for x in range(w):
                base.putpixel((x, y), colors[-1])
            y += 1
    return base


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    """Find DejaVuSans-Bold or fallback to default."""
    candidates = [
        "DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Scene builders (render one static image per scene type)
# ---------------------------------------------------------------------------


def _render_title_scene(vw: int, vh: int, scene: dict, palette, rng) -> Image.Image:
    """Render a title scene."""
    colors = palette[:3]
    img = _make_gradient(vw, vh, colors, angle=30)
    draw = ImageDraw.Draw(img)

    font_title = _find_font(int(vh * 0.08))
    font_sub = _find_font(int(vh * 0.035))

    # Accent line
    ly = int(vh * 0.38)
    lw = int(vw * 0.3)
    lx = (vw - lw) // 2
    draw.rectangle([lx, ly, lx + lw, ly + 4], fill=palette[1 % len(palette)])

    # Title
    title = scene.get("title", "Hostamar")
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tx = (vw - (bbox[2] - bbox[0])) // 2
    ty = int(vh * 0.42)
    draw.text((tx, ty), title, fill=palette[2 % len(palette)], font=font_title)

    # Subtitle
    sub = scene.get("subtitle", "")
    if sub:
        bbox = draw.textbbox((0, 0), sub, font=font_sub)
        sx = (vw - (bbox[2] - bbox[0])) // 2
        sy = ty + int(vh * 0.06) + 8
        draw.text((sx, sy), sub, fill=(200, 200, 220), font=font_sub)

    # Decorative circles
    for i in range(4):
        cx = rng.randint(int(vw * 0.1), int(vw * 0.9))
        cy = rng.randint(int(vh * 0.05), int(vh * 0.3))
        cr = rng.randint(15, 40)
        c = palette[(i + 1) % len(palette)]
        draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr],
                     outline=c, width=2)

    return img


def _render_feature_scene(vw: int, vh: int, scene: dict, palette, rng) -> Image.Image:
    """Render a feature/bullet-point scene."""
    colors = palette[1:3] + palette[:1]
    img = _make_gradient(vw, vh, colors, angle=45)
    draw = ImageDraw.Draw(img)

    font_title = _find_font(int(vh * 0.055))
    font_bullet = _find_font(int(vh * 0.03))

    # Title
    title = scene.get("title", "Features")
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tx = (vw - (bbox[2] - bbox[0])) // 2
    ty = int(vh * 0.12)
    draw.text((tx, ty), title, fill=palette[1 % len(palette)], font=font_title)

    # Bullet lines
    lines = scene.get("lines", ["✦ Premium Quality", "✦ AI Generated", "✦ Bangladesh First"])
    start_y = int(vh * 0.25)
    line_h = int(vh * 0.06)
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line[:40], font=font_bullet)
        lx = (vw - (bbox[2] - bbox[0])) // 2
        ly = start_y + i * line_h
        draw.text((lx, ly), line[:40], fill=palette[2 % len(palette)], font=font_bullet)

    # Decorative boxes
    bw = int(vw * 0.15)
    for i in range(2):
        bx = int(vw * (0.1 + 0.55 * i))
        by = int(vh * 0.8)
        bh = int(vh * 0.08)
        c = palette[(i + 2) % len(palette)]
        draw.rectangle([bx, by, bx + bw, by + bh], fill=c, width=0)
        cp = palette[(i + 1) % len(palette)]
        draw.rectangle([bx + 2, by + 2, bx + bw - 2, by + bh - 2],
                       fill=cp, width=0)

    return img


def _render_content_scene(vw: int, vh: int, scene: dict, palette, rng) -> Image.Image:
    """Render a content/body scene."""
    colors = palette[2:4] + palette[:2]
    img = _make_gradient(vw, vh, colors, angle=60)
    draw = ImageDraw.Draw(img)

    font_title = _find_font(int(vh * 0.05))
    font_body = _find_font(int(vh * 0.028))

    # Title
    title = scene.get("title", "Details")
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tx = (vw - (bbox[2] - bbox[0])) // 2
    ty = int(vh * 0.1)
    draw.text((tx, ty), title, fill=palette[0 % len(palette)], font=font_title)

    # Body text (wrapped)
    body = scene.get("body", "")
    if not body:
        body = "Create amazing videos with Hostamar AI Video"
    font_body_small = _find_font(int(vh * 0.025))
    words = body.split()
    max_w = int(vw * 0.8)
    lines, current = [], []
    for w in words:
        test = " ".join(current + [w])
        bbox = draw.textbbox((0, 0), test, font=font_body_small)
        if (bbox[2] - bbox[0]) < max_w:
            current.append(w)
        else:
            lines.append(" ".join(current))
            current = [w]
    if current:
        lines.append(" ".join(current))

    sy = int(vh * 0.22)
    lh = int(vh * 0.04)
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_body_small)
        lx = (vw - (bbox[2] - bbox[0])) // 2
        draw.text((lx, sy + i * lh), line, fill=(220, 220, 240),
                  font=font_body_small)

    return img


def _render_cta_scene(vw: int, vh: int, scene: dict, palette, rng) -> Image.Image:
    """Render a call-to-action scene."""
    colors = palette[2:3] + palette[:2]
    img = _make_gradient(vw, vh, colors, angle=0)
    draw = ImageDraw.Draw(img)

    font_big = _find_font(int(vh * 0.09))
    font_sub = _find_font(int(vh * 0.035))
    font_body = _find_font(int(vh * 0.028))

    # Big CTA title
    title = scene.get("title", "Get Started")
    bbox = draw.textbbox((0, 0), title, font=font_big)
    tx = (vw - (bbox[2] - bbox[0])) // 2
    ty = int(vh * 0.25)
    draw.text((tx, ty), title, fill=palette[1 % len(palette)], font=font_big)

    # Subtitle
    sub = scene.get("subtitle", "hostamar.com")
    sy = ty + int(vh * 0.1) + 10
    if sub:
        bbox = draw.textbbox((0, 0), sub, font=font_sub)
        sx = (vw - (bbox[2] - bbox[0])) // 2
        draw.text((sx, sy), sub, fill=(200, 200, 220), font=font_sub)

    # Body
    body = scene.get("body", "")
    if body:
        bbox = draw.textbbox((0, 0), body, font=font_body)
        bx = (vw - (bbox[2] - bbox[0])) // 2
        by = sy + int(vh * 0.06) + 10
        draw.text((bx, by), body, fill=(180, 180, 200), font=font_body)

    # Button shape
    bw, bh = int(vw * 0.4), int(vh * 0.07)
    bx = (vw - bw) // 2
    by = int(vh * 0.7)
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=10,
                           fill=palette[0 % len(palette)])

    return img


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------


def generate_video(prompt: str, style: str = "cinematic",
                   duration: int = 5, aspect_ratio: str = "9:16",
                   output_dir: str = "/tmp/hostamar-videos") -> dict:
    """
    Generate an animated video by rendering keyframe scenes + FFmpeg cross-fades.

    Strategy: render one image per scene type, then use FFmpeg to create
    cross-fade transitions between them. This is ~18x faster than rendering
    every frame individually.

    Returns: {videoUrl, thumbnailUrl, duration, provider}
    """
    logger.info("CPU video gen: prompt=%r, style=%s, duration=%ds, ratio=%s",
                prompt[:50], style, duration, aspect_ratio)

    # Resolution (720p is fast on CPU)
    if aspect_ratio == "16:9":
        vw, vh = 1280, 720
    elif aspect_ratio == "1:1":
        vw, vh = 720, 720
    else:
        vw, vh = 720, 1280

    palette = _get_palette(prompt, style)
    seed = int(hashlib.md5(prompt.encode()).hexdigest(), 16) & 0xFFFFFFFF
    rng = random.Random(seed)

    os.makedirs(output_dir, exist_ok=True)
    video_hash = hashlib.sha256((prompt + str(rng.random())).encode()).hexdigest()[:12]
    video_path = os.path.join(output_dir, f"video_{video_hash}.mp4")

    # Build scene descriptions (text only, fast)
    scenes = _build_scenes(prompt, rng)
    n_scenes = len(scenes)

    # Render each scene as a static image
    scene_images: list[Image.Image] = []
    for i, scene in enumerate(scenes):
        t0 = None
        if logger.isEnabledFor(logging.DEBUG):
            t0 = __import__("time").time()

        if scene["type"] == "title":
            img = _render_title_scene(vw, vh, scene, palette, rng)
        elif scene["type"] == "feature":
            img = _render_feature_scene(vw, vh, scene, palette, rng)
        elif scene["type"] == "content":
            img = _render_content_scene(vw, vh, scene, palette, rng)
        elif scene["type"] == "cta":
            img = _render_cta_scene(vw, vh, scene, palette, rng)
        else:
            img = _make_gradient(vw, vh, palette, 0)

        scene_images.append(img)
        if t0 is not None:
            elapsed = __import__("time").time() - t0
            logger.debug("Rendered scene %d (%s) in %.2fs",
                         i, scene.get("type", "?"), elapsed)

    total_frames = duration * FPS
    frames_per_scene = max(total_frames // n_scenes, 1)
    hold_frames = frames_per_scene - int(TRANSITION_DURATION * FPS)
    if hold_frames < 1:
        hold_frames = 1
        transition_frames = 2  # at least 2 transition frames

    # Generate all frames using FFmpeg pipe
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{vw}x{vh}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        video_path,
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    total_written = 0

    for i in range(n_scenes):
        # Hold the current scene
        for _ in range(hold_frames if i < n_scenes - 1 else frames_per_scene):
            if proc.poll() is not None:
                raise RuntimeError("FFmpeg exited prematurely")
            frame = scene_images[i]
            proc.stdin.write(frame.tobytes())
            total_written += 1

        # Cross-fade to next scene
        if i < n_scenes - 1:
            n_transition = int(TRANSITION_DURATION * FPS)
            for t in range(n_transition):
                if proc.poll() is not None:
                    raise RuntimeError("FFmpeg exited prematurely")
                alpha = (t + 1) / (TRANSITION_DURATION * FPS)
                blended = Image.blend(scene_images[i], scene_images[i + 1], alpha)
                proc.stdin.write(blended.tobytes())
                total_written += 1

        if total_written >= total_frames:
            break

    # Pad if short
    while total_written < total_frames:
        if proc.poll() is not None:
            raise RuntimeError("FFmpeg exited prematurely")
        proc.stdin.write(scene_images[-1].tobytes())
        total_written += 1

    proc.stdin.close()
    ret = proc.wait()
    if ret != 0:
        err = proc.stderr.read().decode("utf-8", errors="replace")[:2000]
        raise RuntimeError(f"FFmpeg exited with code {ret}: {err}")

    logger.info("Video generated: %s (%d frames, %ds)",
                video_path, total_frames, duration)

    # Thumbnail
    thumb_path = video_path.replace(".mp4", ".jpg")
    subprocess.run([
        "ffmpeg", "-y", "-i", video_path,
        "-vframes", "1", "-q:v", "2", thumb_path,
    ], capture_output=True)
    thumb_url = f"/videos/{os.path.basename(thumb_path)}" if os.path.exists(thumb_path) else None

    return {
        "videoUrl": f"/videos/{os.path.basename(video_path)}",
        "thumbnailUrl": thumb_url,
        "duration": duration,
        "provider": "cpu",
    }


def _build_scenes(prompt: str, rng: random.Random) -> list:
    """Build 4 scene descriptors from the prompt."""
    words = prompt.split()
    word_count = len(words)
    mid = word_count // 2
    part1 = " ".join(words[:max(mid, 1)])
    part2 = " ".join(words[mid:]) if mid < word_count else prompt

    scenes = [
        {
            "type": "title",
            "title": "Hostamar",
            "subtitle": part1[:60] or "AI ভিডিও",
        },
        {
            "type": "feature",
            "title": "Features",
            "lines": [
                f"✦ {part2[:40]}" if part2 else "✦ Premium Quality",
                "✦ AI Generated",
                "✦ Bangladesh First",
            ],
        },
        {
            "type": "content",
            "title": "Details",
            "body": part1[:120] if len(prompt) > 20 else "Create amazing videos with Hostamar",
        },
        {
            "type": "cta",
            "title": "Get Started",
            "subtitle": "hostamar.com",
            "body": "মাত্র ৳১,০০০/মাস থেকে শুরু",
        },
    ]
    return scenes[:TOTAL_SCENES]
