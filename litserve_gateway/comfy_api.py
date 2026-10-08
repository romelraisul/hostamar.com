#!/usr/bin/env python3
"""Hostamar AI gateway — LitServe in front of ComfyUI, port 11442.

LitServe owns the *server* concerns (concurrency, request batching, worker
lifecycle, /health, /info, OpenAPI).  ComfyUI owns the GPU work; this process
never touches a tensor, so it needs no torch.

    POST /predict   {"prompt": "bangla village", "width": 1024, "height": 576}
    GET  /health    -> {"status": "ok"}          (litserve built-in)
    GET  /info      -> model metadata            (litserve built-in)

Concurrent POSTs are batched: with COMFY_BATCH=4 up to 4 prompts are submitted
to ComfyUI's queue in one predict() pass instead of 4 round trips.

    python comfy_api.py               # serve on $PORT (default 11442)
    python comfy_api.py --selftest    # build the graph, generate one real image
    python comfy_api.py --port 9000
"""
from __future__ import annotations

import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

import litserve as ls

COMFY_URL = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
# Host the *caller* can reach (Cloudflare tunnel / LAN); defaults to COMFY_URL.
COMFY_PUBLIC_URL = os.environ.get("COMFY_PUBLIC_URL", COMFY_URL).rstrip("/")
COMFY_CKPT = os.environ.get("COMFY_CKPT", "sd_xl_turbo_1.0_fp16.safetensors")
PORT = int(os.environ.get("PORT", "11442"))
BATCH = int(os.environ.get("COMFY_BATCH", "4"))
JOB_TIMEOUT = float(os.environ.get("COMFY_JOB_TIMEOUT", "150"))
NEGATIVE = os.environ.get("COMFY_NEGATIVE", "text, watermark, low quality, blurry")

# SDXL-Turbo wants 4 steps / CFG 1.0 — NOT the 20 steps / 7.0 of a base SDXL.
# ponytail: fixed sampler/scheduler, expose them only if a request ever needs
# something other than turbo's validated euler+normal.
SAMPLER, SCHEDULER, STEPS, CFG = "euler", "normal", 4, 1.0


def build_graph(prompt: str, *, seed: int | None = None, width: int = 1024,
                height: int = 576, steps: int = STEPS, cfg: float = CFG,
                prefix: str = "hostamar_ai") -> dict:
    """API-format graph (class_type + inputs), validated against ComfyUI 0.37."""
    return {
        "3": {"class_type": "KSampler", "inputs": {
            "seed": random.randrange(2 ** 31) if seed is None else int(seed),
            "steps": int(steps), "cfg": float(cfg), "sampler_name": SAMPLER,
            "scheduler": SCHEDULER, "denoise": 1.0,
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
            "latent_image": ["5", 0]}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": COMFY_CKPT}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {
            "width": int(width), "height": int(height), "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "PreviewImage", "inputs": {
            "images": ["8", 0], "filename_prefix": prefix}},
    }


def comfy_get(path: str, timeout: float = 15) -> dict:
    with urllib.request.urlopen(f"{COMFY_URL}{path}", timeout=timeout) as r:
        return json.loads(r.read())


def comfy_post(path: str, payload: dict, timeout: float = 30) -> dict:
    req = urllib.request.Request(
        f"{COMFY_URL}{path}", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def view_url(img: dict) -> str:
    q = urllib.parse.urlencode({
        "filename": img.get("filename", ""),
        "subfolder": img.get("subfolder", ""),
        "type": img.get("type", "output")})
    return f"{COMFY_PUBLIC_URL}/view?{q}"


class ComfyAPI(ls.LitAPI):
    # Class attr so LitAPI.__init__ sees it before setup() — silences the
    # "batch/unbatch implemented but max_batch_size not set" warning.
    # LitServer's max_batch_size=BATCH is the same value.
    max_batch_size = BATCH

    def setup(self, device):
        self.device = device
        try:
            stats = comfy_get("/system_stats", timeout=10)
            self.comfy_version = stats.get("system", {}).get("comfyui_version", "?")
            print(f"[comfy_api] ComfyUI {self.comfy_version} at {COMFY_URL}", flush=True)
        except Exception as e:            # stay up; report per request, don't 500 the boot
            self.comfy_version = None
            print(f"[comfy_api] WARNING ComfyUI unreachable at setup: {e}", flush=True)

    # --- request/response shaping -------------------------------------------------
    def decode_request(self, request) -> dict:
        if isinstance(request, str):
            return {"prompt": request}
        prompt = (request or {}).get("prompt") or ""
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("prompt is required and must be a non-empty string")
        # ComfyUI latent dims must be multiples of 8.
        w = int((request or {}).get("width") or 1024) // 8 * 8
        h = int((request or {}).get("height") or 576) // 8 * 8
        return {"prompt": prompt.strip(),
                "width": max(256, min(1536, w)), "height": max(256, min(1536, h)),
                "seed": request.get("seed")}

    def batch(self, inputs: list) -> list:
        return inputs                                   # one dict per request

    def unbatch(self, output: list) -> list:
        return output                                   # one result per request

    # --- the actual work ----------------------------------------------------------
    def predict(self, batch: list) -> list:
        if self.comfy_version is None:                  # recheck: ComfyUI may have come up
            try:
                self.comfy_version = comfy_get("/system_stats", timeout=5)["system"]["comfyui_version"]
            except Exception as e:
                raise RuntimeError(f"ComfyUI unreachable at {COMFY_URL}: {e}") from e

        client_id = str(uuid.uuid4())
        started = time.time()
        pending: list[tuple[dict, str]] = []
        for item in batch:                              # queue all first, then poll all
            g = build_graph(item["prompt"], seed=item.get("seed"),
                            width=item["width"], height=item["height"])
            try:
                pid = comfy_post("/prompt", {"prompt": g, "client_id": client_id})["prompt_id"]
                pending.append((item, pid))
            except urllib.error.HTTPError as e:         # ComfyUI validates the graph
                body = e.read().decode(errors="replace")[:400]
                pending.append((item, f"error:{e.code}:{body}"))

        results: list[dict] = []
        deadline = started + JOB_TIMEOUT
        for item, pid in pending:
            if pid.startswith("error:"):
                _, code, body = pid.split(":", 2)
                results.append({"prompt": item["prompt"], "ok": False,
                                "error": f"comfy_rejected({code})", "detail": body})
                continue
            out = self._wait(pid, deadline)
            out["prompt"] = item["prompt"]
            results.append(out)
        elapsed = round(time.time() - started, 2)
        for r in results:
            r["elapsed_s"] = elapsed
            r["batch_size"] = len(batch)
        return results

    def _wait(self, pid: str, deadline: float) -> dict:
        while time.time() < deadline:
            try:
                hist = comfy_get(f"/history/{pid}", timeout=15)
            except Exception as e:
                return {"ok": False, "error": f"comfy_poll_failed: {e}"}
            entry = hist.get(pid)
            if entry:
                status = (entry.get("status") or {}).get("status_str", "unknown")
                if status == "success":
                    for node in (entry.get("outputs") or {}).values():
                        for img in node.get("images") or []:
                            return {"ok": True, "image": img, "view_url": view_url(img),
                                    "seed": None}
                    return {"ok": False, "error": "comfy_returned_no_image"}
                if status == "error":
                    return {"ok": False, "error": "comfy_execution_error",
                            "detail": json.dumps(entry.get("status"))[:400]}
            time.sleep(0.4)
        return {"ok": False, "error": f"timeout_after_{JOB_TIMEOUT}s"}

    def encode_response(self, output: dict) -> dict:
        return output


def build_server(port: int = PORT) -> ls.LitServer:
    # accelerator stays "cpu": the GPU work happens inside ComfyUI, this process
    # holds no tensors. Set LITSERVE_ACCELERATOR=cuda only if that changes.
    return ls.LitServer(
        ComfyAPI(),
        accelerator=os.environ.get("LITSERVE_ACCELERATOR", "cpu"),
        devices=1,
        timeout=int(JOB_TIMEOUT) + 30,
        max_batch_size=BATCH,
        batch_timeout=0.1,          # wait 100 ms to fill a batch, then go
        api_path="/predict",
    )


def selftest() -> int:
    """Runnable check: graph wiring, then one real image through ComfyUI."""
    g = build_graph("a bangla village at sunrise", seed=42)
    assert g["3"]["inputs"]["positive"] == ["6", 0], "ksampler not wired to positive prompt"
    assert g["6"]["inputs"]["text"].startswith("a bangla village"), "prompt not in graph"
    assert g["9"]["class_type"] == "PreviewImage", "output node missing"
    assert len(g) == 7, f"expected 7 nodes, got {len(g)}"
    print("[selftest] graph wiring OK (7 nodes)")
    try:
        ver = comfy_get("/system_stats", timeout=10)["system"]["comfyui_version"]
    except Exception as e:
        print(f"[selftest] SKIP live check — ComfyUI not reachable: {e}")
        return 0
    print(f"[selftest] ComfyUI {ver}, generating one real image…")
    api = ComfyAPI()
    api.setup("cpu")
    t0 = time.time()
    out = api.predict([{"prompt": "a bangla village at sunrise", "width": 1024,
                        "height": 576, "seed": 42}])[0]
    assert out.get("ok"), f"predict failed: {out}"
    assert out["image"].get("filename"), "no image filename in output"
    raw = urllib.request.urlopen(out["view_url"], timeout=60).read()
    assert raw[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    print(f"[selftest] OK {out['image']['filename']} {len(raw)} bytes "
          f"in {round(time.time() - t0, 2)}s")
    print(f"[selftest] view_url {out['view_url']}")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        raise SystemExit(selftest())
    port = PORT
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    name = f"SDXL-Turbo via ComfyUI @ {COMFY_URL}"
    print(f"[comfy_api] serving {name} on :{port} (batch<={BATCH})", flush=True)
    build_server(port).run(port=port)
