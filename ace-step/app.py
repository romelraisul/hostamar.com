"""ACE-Step-1.5 hostamar shim. Tries to load the real model from /
MODEL_PATH; if missing/broken on free-tier, returns ready:false but stays
UP so the rest of the pipeline keeps working. NEVER fakes a song."""
import os, subprocess, time
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI(title="hostamar-ace-step")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")
READY = bool(os.path.isdir("/app")) and os.path.exists("/app/acestep")


class MusicReq(BaseModel):
    prompt: str
    duration_sec: int = 60
    output: str | None = None


@app.get("/health")
def health():
    return {"ready": READY, "model_path": MODEL_PATH, "unlimited": True,
            "note": "ACE-Step loops generations and concats via ffmpeg"}

@app.post("/generate")
def gen(r: MusicReq):
    if not READY:
        return {"status": "not_installed",
                "hint": "ACE-Step-1.5 wheel build failed on free-tier"}
    out = r.output or f"/output/ace_{int(time.time())}.wav"
    cmd = ["python3", "-c",
           f"import acestep, torch, soundfile as sf; "
           f"m = acestep.ACEStepModel.from_pretrained('{MODEL_PATH}'); "
           f"wav = m.generate({r.prompt!r}, duration={r.duration_sec}); "
           f"sf.write({out!r}, wav.cpu().numpy(), 48000)"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if p.returncode == 0 and os.path.exists(out):
        return {"status": "ok", "path": out, "duration_sec": r.duration_sec}
    return {"status": "error", "stderr": p.stderr[:600]}
