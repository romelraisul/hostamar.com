"""LTX-Video MVP API shim.

POST /generate {prompt, frames, width, height, fps}
  -> queues an LTX-Video workflow on the local ComfyUI lowvram container
  -> returns {prompt_id, status}

GET /health -> {comfyui_url, ready: bool}
"""
import os
import time
import requests
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="hostamar-ltx-video")
COMFY = os.getenv("COMFYUI_URL", "http://hostamar-comfyui:8188")


class GenReq(BaseModel):
    prompt: str
    frames: int = 96           # LTX default ~96 frames ~ 4s @ 24fps
    width: int = 768
    height: int = 512
    fps: int = 24
    seed: int | None = None


@app.get("/health")
def health():
    try:
        r = requests.get(f"{COMFY}/system_stats", timeout=4)
        return {"comfyui_url": COMFY, "ready": r.status_code == 200}
    except Exception as e:
        return {"comfyui_url": COMFY, "ready": False, "error": str(e)}


@app.post("/generate")
def generate(r: GenReq):
    # Build a minimal LTX-Video ComfyUI prompt graph (Exported API topology).
    # The real lowvram workflow lives in
    # video-pipeline-lowvram/workflows/lowvram/ltx-2b-gguf-8gb.json.
    # We POST it to /api/prompt on the comfyui container.
    seed = r.seed if r.seed is not None else int(time.time()) % (2**31)
    workflow_path = "/app/workflows/lowvram/ltx-2b-gguf-8gb.json"
    try:
        wf = open(workflow_path, "rb").read() if os.path.exists(workflow_path) else None
        if wf is None:
            return {"status": "no_workflow_uploaded",
                    "hint": "place LTX workflow JSON at /app/workflows/lowvram/ltx-2b-gguf-8gb.json"}
        import json as J
        g = J.loads(wf)
        # Inject the user prompt + seed into the known text-prompt node id.
        for nid, n in g.items():
            if isinstance(n, dict) and "text" in (n.get("inputs") or {}):
                n["inputs"]["text"] = r.prompt
                n["inputs"]["seed"] = seed
                break
        resp = requests.post(f"{COMFY}/api/prompt", json={"prompt": g},
                             timeout=15)
        if resp.status_code == 200:
            pid = resp.json().get("prompt_id")
            return {"status": "queued", "prompt_id": pid,
                    "comfyui": COMFY, "frames": r.frames, "seed": seed}
        return {"status": "comfyui_rejected",
                "http": resp.status_code,
                "body": resp.text[:300]}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/")
def root():
    return {"service": "hostamar-ltx-video-mvp",
            "comfyui": COMFY,
            "endpoints": ["/health", "/generate"]}
