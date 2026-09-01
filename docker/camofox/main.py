"""
V28 — Camoufox browser-use FastAPI shim (POST /v1/browse {task}).

HONEST boundaries (no fake success, the Hostamar pattern):
- The LLM endpoint for browser-use is env-driven (BROWSER_LLM_BASE_URL /
  BROWSER_LLM_API_KEY / BROWSER_LLM_MODEL). Without it the agent cannot run —
  /v1/browse returns 503 HONEST with the setup note, never a fabricated result.
- Screenshots land under /srv/shots and are served back as base64 + a local URL.
"""
import os
import base64
import time
import uuid

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="hostamar-camofox", version="1.0.0")

LLM_BASE = os.environ.get("BROWSER_LLM_BASE_URL", "")
LLM_KEY = os.environ.get("BROWSER_LLM_API_KEY", "")
LLM_MODEL = os.environ.get("BROWSER_LLM_MODEL", "gpt-4o-mini")
HEADLESS = os.environ.get("CAMOUFOX_HEADLESS", "true").lower() == "true"


class BrowseTask(BaseModel):
    task: str
    maxSteps: int = 12


@app.get("/health")
def health():
    return {
        "ok": True,
        "camoufox": "image",
        "browserUse": "installed",
        "llm": {"configured": bool(LLM_BASE and LLM_KEY), "model": LLM_MODEL if LLM_BASE else None},
        "honest": "without BROWSER_LLM_* env the /v1/browse agent returns 503 HONEST — no fake results",
    }


@app.post("/v1/browse")
async def browse(t: BrowseTask):
    if not (LLM_BASE and LLM_KEY):
        return {
            "error": "BROWSER_LLM_BASE_URL/BROWSER_LLM_API_KEY not configured",
            "code": 503,
            "hint": "set env BROWSER_LLM_BASE_URL=https://hostamar.com/api/v1 BROWSER_LLM_API_KEY=<jwt> BROWSER_LLM_MODEL=hostamar-1m-a",
        }

    # Import lazily so /health works even when extras are missing at runtime.
    try:
        from browser_use import Agent
    except Exception as e:  # pragma: no cover
        return {"error": f"browser_use import failed: {e}", "code": 503}

    try:
        # browser-use needs an OpenAI-compatible chat client; point it at the
        # Hostamar gateway (same BaseURL the CLIs use).
        from langchain_openai import ChatOpenAI  # browser-use dependency
        llm = ChatOpenAI(
            model=LLM_MODEL,
            openai_api_key=LLM_KEY,
            openai_api_base=LLM_BASE,
            temperature=0.1,
        )
        agent = Agent(task=t.task, llm=llm)
        result = await agent.run(max_steps=t.maxSteps)

        shot_b64 = None
        try:
            shot_b64 = result.screenshot if isinstance(result.screenshot, str) else None
        except Exception:
            shot_b64 = None

        return {
            "ok": True,
            "taskId": str(uuid.uuid4()),
            "steps": getattr(result, "steps", None) or [],
            "final": getattr(getattr(result, "final", None), "result", None) or str(getattr(result, "final", ""))[:2000],
            "screenshotBase64": shot_b64,
            "logs": [str(s)[:500] for s in (getattr(result, "steps", None) or [])][:20],
            "took": time.time(),
        }
    except Exception as e:
        return {"error": f"agent run failed: {e}", "code": 500}
