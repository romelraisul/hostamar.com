"""Chatterbox API. Stub that calls /health on chatterbox if installed;
else returns honest 'not bundled'. The Docker build clones chatterbox; on
free-tier if torch wheel download fails we keep the container UP but say
'ready:false'. NEVER fake voice generation."""
import os
import subprocess
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="hostamar-chatterbox")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")
CHATTERBOX_INSTALLED = os.path.isdir("/app/chatterbox") and \
    os.path.exists("/app/chatterbox/chatterbox")


class TTSReq(BaseModel):
    text: str
    voice: str = "default"           # default cloning voice
    output: str | None = None        # absolute output path inside container


@app.get("/health")
def health():
    return {
        "ready": CHATTERBOX_INSTALLED,
        "model_path": MODEL_PATH,
        "voice_clone": "supported" if CHATTERBOX_INSTALLED else "stub_only",
    }


@app.post("/tts")
def tts(r: TTSReq):
    if not CHATTERBOX_INSTALLED:
        return {"status": "not_installed",
                "hint": "chatterbox wheel build failed on free-tier; rerun build on stable link"}
    out = r.output or f"/output/tts_{int(__import__('time').time())}.wav"
    try:
        # Subprocess - never inline import the heavy model on the API path
        code = (
            "from chatterbox.tts import ChatterboxTTS; "
            f"m = ChatterboxTTS.from_pretrained(device='cpu'); "
            f"w = m.generate({r.text!r}); "
            f"w.save({out!r})"
        )
        p = subprocess.run(["python3", "-c", code],
                            cwd="/app/chatterbox",
                            capture_output=True, text=True, timeout=600)
        if p.returncode == 0 and os.path.exists(out):
            return {"status": "ok", "path": out}
        return {"status": "error", "stderr": p.stderr[:600]}
    except Exception as e:
        return {"status": "error", "error": str(e)}
