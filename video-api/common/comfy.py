# backend/common/comfy.py
"""Helpers to submit a ComfyUI workflow and poll /history for completion.

NOTE: Node *titles* used in the workflow JSONs are the canonical titles printed by
each custom node. If a node was renamed upstream, the JSON `title` values must be
updated to match `GET /object_info`. This module only handles submission/polling.
"""
import time
import httpx
from common.config import settings


def submit_prompt(base_url: str, workflow: dict, client_id: str) -> str:
    """POST /prompt, return prompt_id. Raises on non-200."""
    resp = httpx.post(
        f"{base_url}/prompt",
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["prompt_id"]


def get_history(base_url: str, prompt_id: str) -> dict | None:
    resp = httpx.get(f"{base_url}/history/{prompt_id}", timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get(prompt_id)


def wait_for_completion(base_url: str, prompt_id: str, timeout_s: int = 1800, poll: float = 5.0) -> dict:
    """Poll /history until the prompt_id appears (completed or errored)."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        hist = get_history(base_url, prompt_id)
        if hist is not None:
            outputs = hist.get("outputs", {})
            status = hist.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI prompt {prompt_id} errored: {status}")
            if outputs:
                return hist
        time.sleep(poll)
    raise TimeoutError(f"prompt {prompt_id} did not finish in {timeout_s}s")


def extract_output_urls(base_url: str, hist: dict) -> list[str]:
    """Return local server URLs (/view?...) for every image/video output in history."""
    urls = []
    for node_out in hist.get("outputs", {}).values():
        for img in node_out.get("images", []):
            params = "&".join(f"{k}={v}" for k, v in img.items())
            urls.append(f"{base_url}/view?{params}")
    return urls
