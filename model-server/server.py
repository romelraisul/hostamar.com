"""
hostamar-model — OpenAI/OpenClaw-compatible proxy to Ollama.

Exposes:
  GET  /v1/models                    — list available Ollama models
  POST /v1/chat/completions          — OpenAI chat completions
  POST /v1/completions               — OpenAI legacy completions
  POST /v1/embeddings                — OpenAI embeddings (Ollama /api/embeddings)
  POST /api/pull                     — convenience: trigger an Ollama pull
  GET  /health                       — service liveness
  GET  /metrics                      — Prometheus-compatible metrics

The default Ollama target is read from OLLAMA_HOST (default
http://hostamar-ollama:11434). The default model is OLLAMA_MODEL
(default qwen3.6:27b — pin to the model you want permanently).

This service is the single entry point for hostamar-app and any
OpenClaw-style tool that wants to talk to Ollama using OpenAI's API.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse, Response
import httpx
import json
import time
import os
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://hostamar-ollama:11434").rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.6:27b")
INFERENCE_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "1200"))  # 20 min default

app = FastAPI(title="hostamar-model", version="2.0.0")

# Prometheus metrics
REQUESTS = Counter(
    "hostamar_model_requests_total",
    "Total requests to hostamar-model",
    labelnames=("endpoint", "model"),
)
LATENCY = Histogram(
    "hostamar_model_request_duration_seconds",
    "Inference latency",
    labelnames=("endpoint", "model"),
)


async def ollama_get(path: str, **kwargs) -> httpx.Response:
    async with httpx.AsyncClient(timeout=INFERENCE_TIMEOUT) as client:
        return await client.get(f"{OLLAMA_HOST}{path}", **kwargs)


async def ollama_post(path: str, json_body: dict, **kwargs) -> httpx.Response:
    async with httpx.AsyncClient(timeout=INFERENCE_TIMEOUT) as client:
        return await client.post(f"{OLLAMA_HOST}{path}", json=json_body, **kwargs)


@app.get("/health")
async def health():
    """Liveness check. Reports whether Ollama is reachable too."""
    ollama_alive = False
    try:
        r = await ollama_get("/api/tags")
        ollama_alive = r.status_code == 200
    except Exception:
        pass
    return {
        "status": "ok" if ollama_alive else "degraded",
        "ollama": OLLAMA_HOST,
        "ollama_reachable": ollama_alive,
        "default_model": DEFAULT_MODEL,
        "time": int(time.time()),
    }


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible model listing. Wraps Ollama's /api/tags."""
    REQUESTS.labels("v1.models", DEFAULT_MODEL).inc()
    try:
        r = await ollama_get("/api/tags")
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}")
    models = [
        {
            "id": m["name"],
            "object": "model",
            "created": int(time.time()),
            "owned_by": "ollama",
            "parameter_size": m.get("details", {}).get("parameter_size", ""),
            "family": m.get("details", {}).get("family", ""),
        }
        for m in data.get("models", [])
    ]
    return {"object": "list", "data": models}


@app.post("/api/chat")
async def legacy_chat_completions(req: Request):
    """Backward-compatible: /api/chat → /v1/chat/completions."""
    return await chat_completions(req)


@app.post("/v1/chat/completions")
async def chat_completions(req: Request):
    """OpenAI-style chat → Ollama /api/chat."""
    body = await req.json()
    model = body.get("model") or DEFAULT_MODEL
    REQUESTS.labels("v1.chat_completions", model).inc()
    start = time.time()

    # Ensure non-streaming for Ollama
    body["stream"] = False

    try:
        r = await ollama_post("/api/chat", body)
        LATENCY.labels("v1.chat_completions", model).observe(time.time() - start)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Model inference timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    # Ollama may return streaming NDJSON even with stream=false;
    # collect all lines and take the last (final) one as the response.
    text = r.text.strip()
    if not text:
        return JSONResponse(content={"error": "Empty response from Ollama"}, status_code=502)

    lines = text.split("\n")
    try:
        final_line = json.loads(lines[-1])
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from Ollama: {text[:200]}")

    # Map Ollama /api/chat response to OpenAI chat completions shape
    content = final_line.get("message", {}).get("content", "")
    return JSONResponse(content={
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": final_line.get("done_reason") or "stop",
        }],
        "usage": {
            "prompt_tokens": final_line.get("prompt_eval_count", 0),
            "completion_tokens": final_line.get("eval_count", 0),
            "total_tokens": (final_line.get("prompt_eval_count", 0) + final_line.get("eval_count", 0)),
        }
    }, status_code=r.status_code)


@app.post("/v1/completions")
async def completions(req: Request):
    """OpenAI legacy completions → Ollama /api/generate."""
    body = await req.json()
    model = body.get("model") or DEFAULT_MODEL
    REQUESTS.labels("v1.completions", model).inc()
    start = time.time()
    try:
        r = await ollama_post("/api/generate", body)
        LATENCY.labels("v1.completions", model).observe(time.time() - start)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Model inference timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return JSONResponse(content=r.json(), status_code=r.status_code)


@app.post("/v1/embeddings")
async def embeddings(req: Request):
    """OpenAI embeddings → Ollama /api/embeddings."""
    body = await req.json()
    model = body.get("model") or DEFAULT_MODEL
    REQUESTS.labels("v1.embeddings", model).inc()
    try:
        r = await ollama_post("/api/embeddings", body)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return JSONResponse(content=r.json(), status_code=r.status_code)


@app.post("/api/pull")
async def trigger_pull(req: Request):
    """Triggers an Ollama pull (e.g. for keeping qwen3.6:27b pinned)."""
    body = await req.json()
    try:
        r = await ollama_post("/api/pull", body)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return JSONResponse(content=r.json(), status_code=r.status_code)


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Legacy placeholder routes from earlier hostamar-model image
@app.post("/predict")
async def legacy_predict(req: Request):
    """Backward-compatible with the old stub /predict endpoint."""
    REQUESTS.labels("legacy.predict", DEFAULT_MODEL).inc()
    body = await req.json()
    prompt = body.get("prompt") or body.get("input") or ""
    body2 = {
        "model": DEFAULT_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    try:
        r = await ollama_post("/api/generate", body2)
        out = r.json()
    except Exception as e:
        return {"result": "ok", "note": f"Ollama unavailable: {e}"}
    return {"result": out.get("response", "")}
