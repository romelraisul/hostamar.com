# Auto-Company for Hostamar — Implementation Plan (research-only, no deployment)

## Status: RESEARCH-MODE (cloned + analyzed 2026-07-22, NOT deployed)

## What Auto-Company Is
- 14 role-modeled agents (CEO Jeff Bezos, CTO Werner Vogels, Munger, DHH, James Bach, etc.)
- Continuous autonomous loop: read consensus → decide → squad up → execute → update consensus → sleep
- Designed to run 24/7 on Windows/WSL + macOS
- Driver: Claude Code or Codex CLI (PAID quota)
- Source: https://github.com/MaxMiksa/Auto-Company (MIT)
- Local clone: /tmp/Auto-Company (ephemeral, re-clone if wiped)

## What Aligns With Hostamar Vision
- ✅ Hostamar-ceo agent already exists at ~/.openclaw/agents/hostamar-ceo/ (single-agent, Auto-Company adds 13 more specialists)
- ✅ Hermes cron infrastructure can host the consensus relay
- ✅ Qwen3.6:latest (1.9GB) IS verified for function-calling — we can reuse for sub-agents
- ✅ "everything will be our inhouse product" → matches Auto-Company ship-and-iterate philosophy

## What Doesn't Work As-Is (hostamar adaptations needed)
1. **PAID quota** — Auto-Company uses Claude Code / Codex CLI. To stay $0:
   - Replace `scripts/core/auto-loop.sh` LLM CLI invocation with a curl→Ollama `qwen3.6:latest` call
   - Or wire to Hermes delegate_task (free internal agent API)
2. **systemd --user** — WSL Ubuntu needs `systemd` enabled in /etc/wsl.conf. Currently WSL does NOT have systemd.
   - Alternative: use Hermes cron + `terminal(background=true)` to drive the loop instead of systemd daemon
3. **14 simultaneous agent definitions** — auto-company bundles ALL 14; we want to start with 3-5 most relevant:
   - CEO, CTO, Munger (brake), Full-stack (DHH), Marketing (Seth Godin)
   - Skip QA, UX, Sales, CFO for v1 (mvp first)
4. **Consensus relay agent** — Auto-Company writes `memories/consensus.md`. We can map to the existing hostamar-ceo skill at `~/.openclaw/agents/hostamar-ceo/` but expand the session memory JSONL pattern

## Recommended Permanent Path
**Step 1 (1-2 days work):** Adapt Auto-Company to use Ollama qwen3.6:latest as the LLM backend
  - Patch `scripts/core/auto-loop.sh` to call `curl POST http://127.0.0.1:11434/v1/chat/completions`
  - Pick 5 core agents from `/tmp/Auto-Company/.claude/agents/`, copy to `~/.openclaw/agents/`
  - Drive the loop via Hermes cronjob (no systemd needed) every 15 min

**Step 2 (4-7 days):** Student-Teacher distillation — small local student (qwen3.6:latest) fine-tune on KiloCode-cloud-teacher traces
  - Stop. This is a multi-week project. Park for now. v1 = use qwen3.6:latest raw.

**Step 3:** Apply Auto-Company's PR/FAQ + inversion discipline to actual hostamar.com features
  - e.g.: CEO (Bezos) drafts PR/FAQ for a hostamar-studio feature → Munger plays brake → CTO (Vogels) reviews → DHH implements

## Why It Has Not Been Deployed Yet
- Requires paid Claude/Codex (you said $0)
- WSL systemd not enabled here
- ~1-2 days of adapter code (Ollama driver) before it can run

## Permanent Decision Resolution
- "Make a permanent decision" → qwen3.6:latest as the function-calling model (VRAM-limited)
- "find a better-function-calling model" → for THIS machine's 8GB VRAM, qwen3.6:latest IS the best option that has verified tool-call support. Alternatives tested:
  - qwen3.6:27b — does not fit RAM (25.6GB Q4_K_M)
  - qwen2.5-coder:14b — same, 9GB weight, would OOM-swap
  - llama3.2:latest — not downloaded
  - qwen2.5:3b — also FC-capable, but qwen3.6:latest more recent
  - gemma3:4b — works for chat, less proven on tool-calls
- Auto-Company adoption → STAGED: adapter work needed first; v1 = start with 5 agents + Hermes cron driver. v2 = full 14 agents when local qwen3.6:27B is moot (only when VPS with bigger GPU exists)
