"""Hostamar multi-model embedding router (all-local, $0, no OpenRouter).

Deploy: copy to ~/hostamar-build/embedding-router.py and run as the user unit
`hostamar-embedding-router.service` (see ops/systemd/). Listens on :8081
(:8082 was taken by longcat-browser), talks to Ollama on :11434, exposed as
https://embeddings.hostamar.com via tunnel 5affa5bd.

Models/ports/units documented in docs/BILLING.md and AGENTS.md.
"""
#!/usr/bin/env python3
"""Hostamar embedding router - all local, no OpenRouter.

POST /v1/embeddings  (OpenAI-compatible) -> auto-picks a model, forwards to
Ollama's /api/embed, returns the OpenAI shape plus "_router" metadata.

Routing (no explicit model from the client):
  Bangla script            -> bge-m3          (1024d, multilingual/Bangla best)
  short  (< 300 tok)       -> all-minilm      (384d, fastest; bge-small-en-v1.5
                                               is not in the Ollama library)
  long   (> 500 tok/2000c) -> nomic-embed-text(768d, 8192 ctx)
  default                  -> mxbai-embed-large (1024d, best English quality)

VRAM is handled by Ollama itself: one loaded model at a time, unloaded after
OLLAMA_KEEP_ALIVE idle (5m), so the 8GB card stays usable for ComfyUI.
ponytail: stdlib http.server, no FastAPI/uvicorn; swap in FastAPI only if we
ever need streaming/concurrency beyond threads.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
PORT = int(os.environ.get("ROUTER_PORT", "8081"))
KEEP_ALIVE = os.environ.get("OLLAMA_KEEP_ALIVE", "5m")

MODELS = {
    "bangla": os.environ.get("EMBED_MODEL_BANGLA", "bge-m3"),
    "small": os.environ.get("EMBED_MODEL_SMALL", "all-minilm"),
    "long": os.environ.get("EMBED_MODEL_LONG", "nomic-embed-text"),
    "default": os.environ.get("EMBED_MODEL_DEFAULT", "mxbai-embed-large"),
}
ALLOWED = set(MODELS.values())

BANGLA = re.compile(r"[\u0980-\u09FF]")


def choose_model(text: str, requested: str | None = None):
    """Return (model, reason). Pure - unit tested in __main__."""
    if requested and requested in ALLOWED:
        return requested, "requested"
    if BANGLA.search(text):
        return MODELS["bangla"], "bangla"
    tok = len(text) // 4
    if tok < 300:
        return MODELS["small"], "short"
    if tok > 500 or len(text) > 2000:
        return MODELS["long"], "long"
    return MODELS["default"], "default"


def embed(texts, model):
    body = json.dumps({"model": model, "input": texts, "keep_alive": KEEP_ALIVE}).encode()
    req = urllib.request.Request(f"{OLLAMA}/api/embed", data=body,
                                headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, code, payload):
        raw = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path in ("/health", "/"):
            loaded = []
            try:
                with urllib.request.urlopen(f"{OLLAMA}/api/ps", timeout=10) as r:
                    loaded = [m["name"] for m in json.loads(r.read()).get("models", [])]
            except Exception:
                pass
            self._send(200, {"status": "ok", "service": "hostamar-embedding-router",
                             "models": MODELS, "loaded": loaded})
        else:
            self._send(404, {"error": {"message": "not found"}})

    def do_POST(self):
        if self.path not in ("/v1/embeddings", "/api/embed", "/embed"):
            self._send(404, {"error": {"message": "not found"}})
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)))
        except Exception:
            self._send(400, {"error": {"message": "Invalid JSON"}})
            return
        inp = body.get("input")
        if inp is None:
            self._send(400, {"error": {"message": "input is required"}})
            return
        texts = inp if isinstance(inp, list) else [inp]
        if not texts or not all(isinstance(t, str) for t in texts):
            self._send(400, {"error": {"message": "input must be a string or list of strings"}})
            return
        # An OpenAI model name the caller sends (text-embedding-3-small) is not
        # one we serve, so it reads as "you choose" - see choose_model().
        model, reason = choose_model(" ".join(texts), body.get("model"))
        try:
            out = embed(texts, model)
        except Exception as e:
            detail = getattr(e, "reason", e)
            if isinstance(e, urllib.error.HTTPError):
                try:
                    detail = json.loads(e.read())
                except Exception:
                    pass
            self._send(502, {"error": {"message": f"ollama unavailable: {detail}",
                                       "model": model}})
            return
        vecs = out.get("embeddings") or []
        tokens = sum(len(t) // 4 for t in texts)
        self._send(200, {
            "object": "list",
            "data": [{"object": "embedding", "index": i, "embedding": v}
                     for i, v in enumerate(vecs)],
            "model": out.get("model", model),
            "usage": {"prompt_tokens": tokens, "total_tokens": tokens},
            "_router": {"chosen_model": model, "reason": reason,
                        "dim": len(vecs[0]) if vecs else 0,
                        "detected_language": "bangla" if BANGLA.search(" ".join(texts)) else "en"},
        })

    def log_message(self, format, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), format % args))


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        assert choose_model("বিকাশে টাকা কীভাবে ঢোকে")[1] == "bangla"
        assert choose_model("hello world")[1] == "short"
        assert choose_model("word " * 900)[1] == "long"
        assert choose_model("word " * 400)[1] == "default"
        assert choose_model("hello", "bge-m3") == ("bge-m3", "requested")
        assert choose_model("hello", "text-embedding-3-small")[1] == "short"
        print("selftest OK", MODELS)
        sys.exit(0)
    print(f"embedding router on :{PORT} -> {OLLAMA} keep_alive={KEEP_ALIVE}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
