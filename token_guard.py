#!/usr/bin/env python3
"""
token_guard.py — pre-call token guard for Nvidia (and any metered) models.

Wired into LiteLLM via litellm_settings.pre_call_checks (see litellm-config.final.yaml).
LiteLLM imports this module and calls `async_pre_call_check(request, **kwargs)`
BEFORE sending the request to the model. Returning False blocks the call and
LiteLLM routes to the next model in `fallbacks`.

This guards ONLY metered/rate-limited providers (Nvidia free tier here).
Local models (Ollama/LMStudio) are never checked — they have no token ceiling.

NOTE: the chat's `sys.stdin` + `sys.exit(2)` version does NOT work with LiteLLM.
LiteLLM calls a Python hook, not a subprocess reading stdin. This is the real form.
"""
import logging
from litellm.integrations.custom_logger import CustomLogger

logger = logging.getLogger("token_guard")

# Nvidia free tier ceiling is ~30K tokens/req. Refuse above this and let LiteLLM
# fall back to a local model (Ollama/LMStudio) which has no ceiling.
MAX_TOKENS = 28000

# Models this guard applies to (by model_name or litellm model string).
GUARDED_PREFIXES = ("nvidia/", "z-ai/", "openai/z-ai")


def rough_token_count(text: str) -> int:
    """~4 chars/token heuristic. Cheap, no model load."""
    return len(text or "") // 4


class TokenGuard(CustomLogger):
    async def async_pre_call_check(self, request, **kwargs):
        # request is the prepared LiteLLM request dict
        model = (kwargs.get("model") or request.get("model") or "")
        messages = request.get("messages") or []

        # Only guard metered cloud models.
        if not any(p in str(model) for p in GUARDED_PREFIXES):
            return True  # allow local models through untouched

        total = sum(rough_token_count(m.get("content", "")) for m in messages)
        if total > MAX_TOKENS:
            logger.warning(
                "token_guard REFUSE nvidia model=%s tokens=%d > %d -> fallback",
                model, total, MAX_TOKENS,
            )
            return False  # block -> LiteLLM uses fallbacks
        return True


# LiteLLM expects a callable/class in pre_call_checks; expose the instance.
token_guard = TokenGuard()
