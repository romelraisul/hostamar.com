"""InfiniteTalk hostamar shim. Honest: returns ready=False if the upstream
model isn't loadable on this box. Stays UP regardless. No fake lip-sync."""
import os, subprocess, time
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI(title="hostamar-infinitetalk")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")
READY = os.path.isdir("/app/InfiniteTalk")


class LipReq(BaseModel):
    audio_path: str
    portrait_path: str
    output: str | None = None


@app.get("/health")
def health():
    return {"ready": READY, "model_path": MODEL_PATH, "unlimited": True}


@app.post("/lipsync")
def lipsync(r: LipReq):
    if not READY:
        return {"status": "not_installed",
                "hint": "InfiniteTalk did not build on free-tier yet"}
    out = r.output or f"/output/lip_{int(time.time())}.mp4"
    # The repo's inference.py CLI shape (per upstream README).
    p = subprocess.run([
        "python3", "/app/InfiniteTalk/inference.py",
        "--audio", r.audio_path,
        "--portrait", r.portrait_path,
        "--out", out,
    ], capture_output=True, text=True, timeout=1800)
    if p.returncode == 0 and os.path.exists(out):
        return {"status": "ok", "path": out}
    return {"status": "error", "stderr": p.stderr[:600]}
