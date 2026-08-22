#!/usr/bin/env python3
"""Gender-aware voice selection for the Bangla dub pipeline.

Detects the dominant speaker gender of the source video and maps it to a
matching Bangla edge-tts voice:

    male   -> bn-BD-PradeepNeural
    female -> bn-BD-NabanitaNeural

Detection strategy (lightweight, CPU-only, no external deps beyond numpy):
1. PRIMARY — audio pitch: autocorrelation F0 over voiced frames of the
   original audio. Median F0 > PITCH_FEMALE_HZ => female.
2. FALLBACK A — visual: sample frames from the video and classify faces with
   an ONNX gender model when ONNX_GENDER_MODEL is configured (optional).
3. FALLBACK B — filename/title heuristics ("woman", "female", "মহিলা", ...).
4. DEFAULT — male (business-content prior), as specified.

Returns (gender, method, confidence) and never raises: the pipeline must not
die because detection failed.
"""
import json, os, re, subprocess, sys, tempfile, wave

PITCH_FEMALE_HZ = float(os.environ.get("GENDER_PITCH_FEMALE_HZ", "165"))
FMIN, FMAX = 75.0, 400.0
FRAME_LEN_S = 0.04   # 40 ms analysis frames
HOP_S = 0.02         # 20 ms hop

VOICES = {
    "male": "bn-BD-PradeepNeural",
    "female": "bn-BD-NabanitaNeural",
}

FEMALE_HINTS = re.compile(
    r"\b(woman|women|female|girl|lady|her\b|she\b|actress|heroine)\b|মহিলা|নারী|নারীর|ত্রৈমাসিক|মেয়ে",
    re.IGNORECASE,
)

def log(msg):
    print("[gender] " + msg, flush=True)

# ---------------------------------------------------------------- audio -----

def _read_mono_wav(path):
    """Read any audio/video file into mono float32 PCM via ffmpeg -> wav."""
    import array
    raw_wav = path if path.lower().endswith(".wav") else None
    tmp = None
    if raw_wav is None:
        fd, tmp = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", tmp],
            capture_output=True, text=True, timeout=600)
        if r.returncode != 0:
            raise RuntimeError("ffmpeg extract failed: " + r.stderr[-200:])
        raw_wav = tmp
    try:
        with wave.open(raw_wav, "rb") as w:
            sr = w.getframerate()
            nch = w.getnchannels()
            sw = w.getsampwidth()
            frames = w.readframes(w.getnframes())
    finally:
        if tmp:
            try: os.remove(tmp)
            except OSError: pass
    if sw == 2:
        samples = array.array("h")
        samples.frombytes(frames)
        y = [s / 32768.0 for s in samples[::nch]]
    elif sw == 4:
        samples = array.array("i")
        samples.frombytes(frames)
        y = [s / 2147483648.0 for s in samples[::nch]]
    else:
        raise RuntimeError("unsupported wav sample width " + str(sw))
    return sr, y

def _autocorr_f0_frames(y, sr):
    """Return list of per-frame F0 estimates for sufficiently-voiced frames."""
    fl = int(FRAME_LEN_S * sr)
    hp = int(HOP_S * sr)
    lag_min = int(sr / FMAX)
    lag_max = min(int(sr / FMIN), fl - 1)
    out = []
    total_energy = 0.0
    frame_energies = []
    for start in range(0, len(y) - fl, hp):
        frame = y[start:start + fl]
        e = sum(v * v for v in frame)
        frame_energies.append((start, e))
        total_energy += e
    if not frame_energies or total_energy <= 0:
        return []
    # keep loudest ~25% frames (speech-dominant), skip near-silence
    thresh = sorted(e for _, e in frame_energies)[int(len(frame_energies) * 0.75)]
    for start, e in frame_energies:
        if e < thresh:
            continue
        frame = y[start:start + fl]
        mean = sum(frame) / fl
        f = [v - mean for v in frame]
        norm = sum(v * v for v in f)
        if norm <= 0:
            continue
        best_lag, best_val = 0, 0.0
        for lag in range(lag_min, lag_max + 1):
            s = sum(f[i] * f[i + lag] for i in range(fl - lag))
            v = s / norm
            if v > best_val:
                best_val, best_lag = v, lag
        if best_lag > 0 and best_val > 0.5:  # periodicity threshold
            out.append(sr / best_lag)
    return out

def detect_audio(video_or_wav):
    sr, y = _read_mono_wav(video_or_wav)
    f0s = _autocorr_f0_frames(y, sr)
    if len(f0s) < 20:
        return None, "not enough voiced frames (%d)" % len(f0s)
    f0s.sort()
    median = f0s[len(f0s) // 2]
    gender = "female" if median > PITCH_FEMALE_HZ else "male"
    conf = round(min(1.0, abs(median - PITCH_FEMALE_HZ) / 100.0 + 0.6), 2)
    return {"gender": gender, "median_f0": round(median, 1), "voiced_frames": len(f0s)}, None

# --------------------------------------------------------------- visual -----

ONNX_MODEL_PATH = os.environ.get("ONNX_GENDER_MODEL", "")

def detect_visual(video):
    """Optional ONNX gender classifier on sampled frames.

    Configure ONNX_GENDER_MODEL to a model exposing input 'input' (1x3x224x224,
    float 0..1 RGB) and output [female_prob, male_prob] (e.g. a fairface-trained
    mobilenet). Skipped entirely when unset — keeps the pipeline dependency-free.
    """
    if not ONNX_MODEL_PATH or not os.path.exists(ONNX_MODEL_PATH):
        return None, "no ONNX gender model configured"
    try:
        import onnxruntime as ort  # optional dep
        import numpy as np
    except ImportError:
        return None, "onnxruntime not installed"
    d = tempfile.mkdtemp(prefix="genderframes")
    r = subprocess.run(["ffmpeg", "-y", "-i", video, "-vf", "thumbnail,scale=224:224",
                        "-frames:v", "3", os.path.join(d, "f%d.jpg")],
                       capture_output=True, text=True, timeout=300)
    frames = sorted(os.listdir(d))
    if r.returncode != 0 or not frames:
        return None, "frame extraction failed"
    sess = ort.InferenceSession(ONNX_MODEL_PATH, providers=["CPUExecutionProvider"])
    female_votes = 0
    used = 0
    for f in frames:
        # decode jpg via ffmpeg into raw rgb
        rr = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(d, f),
                             "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                            capture_output=True, timeout=60)
        img = np.frombuffer(rr.stdout, dtype=np.uint8)
        if img.size != 224 * 224 * 3:
            continue
        x = (img.astype(np.float32) / 255.0).reshape(1, 3, 224, 224).transpose(0, 1, 2, 3)
        inp = {"input": x} if "input" in [i.name for i in sess.get_inputs()] else {sess.get_inputs()[0].name: x}
        probs = sess.run(None, inp)[0][0]
        used += 1
        if float(probs[0]) > 0.8:
            female_votes += 1
    if not used:
        return None, "no decodable frames"
    return {"gender": "female" if female_votes else "male",
            "female_votes": female_votes, "frames": used}, None

# -------------------------------------------------------------- textual -----

def detect_textual(*texts):
    joined = " ".join(t for t in texts if t)
    if joined and FEMALE_HINTS.search(joined):
        return {"gender": "female"}, None
    return None, "no female hints"

# ---------------------------------------------------------------- public ----

def detect_gender(video_path, title=""):
    """Main entry: returns dict(gender=..., voice=..., method=..., detail=...).

    Priority: audio pitch > visual ONNX > title heuristics > default male.
    Never raises.
    """
    result = {"gender": "male", "voice": VOICES["male"], "method": "default", "detail": ""}
    # 1. audio
    try:
        info, err = detect_audio(video_path)
        if info:
            result.update(gender=info["gender"], voice=VOICES[info["gender"]],
                          method="audio_pitch", detail=json.dumps(info))
            return result
        result["detail"] = "audio: " + err
    except Exception as e:
        result["detail"] = "audio error: " + str(e)[:150]
    # 2. visual
    try:
        info, err = detect_visual(video_path)
        if info:
            result.update(gender=info["gender"], voice=VOICES[info["gender"]],
                          method="visual_onnx", detail=json.dumps(info))
            return result
        result["detail"] += "; visual: " + err
    except Exception as e:
        result["detail"] += "; visual error: " + str(e)[:150]
    # 3. textual hints
    info, _err = detect_textual(title)
    if info:
        result.update(gender=info["gender"], voice=VOICES[info["gender"]], method="title_hints")
    return result

if __name__ == "__main__":
    video = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else ""
    print(json.dumps(detect_gender(video, title), ensure_ascii=False))
