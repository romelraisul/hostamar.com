# Capacity: second-box / cloud offload plan (ComfyUI video pipeline)

Date: 2026-10-11. Author context: single box DESKTOP-9KA03CQ (RTX 5060 8GB,
64GB RAM) runs prod site, fleet, bonsai2 LLM, AND the ComfyUI video render
pipeline. Radar shows the standing WARN: ComfyUI 21.9GB RSS mid-render,
swap cliff 16→2.1GB, GPU 100% for hours, and dirty shutdowns (Event 41,
BugcheckCode 0 — see WINDOWS_CRASH_08_51_ANALYSIS.md) that line up with
sustained load windows.

Constraint (user, standing): NO money, NO card — free tiers only. Every
option below is priced honestly anyway; the free paths are marked.

## Why offload at all

1. Renders steal the GPU from bonsai2 (LLM) and any interactive work.
2. 21.9GB RSS + 14GiB swap pressure is the documented cliff; a second big
   render while TV/fleet cron runs risks another hard freeze.
3. Crashes take down prod hostamar.com + api tunnel — the site currently
   depends on this box (probe catches it, but availability doesn't improve).

## Options

### Option A — second local box (RTX 4060 8GB class) — ~$250-350 one-time
**Best fit if hardware can be sourced.**

- Move ComfyUI (all of it: models, renders, TV pipeline workers) to box 2.
- Connect over Tailscale (already in use for SSH CI patterns) — ComfyUI's
  HTTP API works fine over tailnet; the pipeline scripts
  (`comfyui-api-drive` skill workflow) only need a base_url change.
- Models: re-download to the new box (WSL disk rule: never C:), or copy
  ~/ComfyUI/models over the tailnet once.
- Box 1 keeps: prod site, fleet, bonsai2, and becomes render-free →
  GPU contention and the freeze-correlated load both disappear.
- Cost: hardware only. Power: one more always-on box ~20-60W.
- Risk: computer-not-always-on user habit means box 2 must boot-on-power
  (BIOS: AC power on) — same trick box 1 presumably uses.

### Option B — cloud GPU spot (RunPod / Vast.ai) — ~$0.20-0.60/hr
**Best fit for burst renders; NOT free.**

- RunPod serverless/community GPU or Vast.ai RTX 4090 rental: upload the
  workflow JSON + models (~5-20GB), render, pull MP4 back, destroy pod.
- The pipeline already speaks ComfyUI /prompt API — pointing it at a remote
  host is a config change, not a rewrite.
- Cost estimate per 60s 1080p narrated episode at current pipeline speed:
  roughly 10-25 GPU-minutes → $1-3/episode. NOT viable under the no-card
  constraint until revenue (AppSumo launch in roadmap) pays for it.
- Free-tier reality: no cloud gives free GPU hours for this. Kaggle/P Colab
  free tiers exist (30h/week T4 class) but model size (HunyuanVideo 1.5 fp8)
  exceeds free VRAM → out.

### Option C — stay on one box, remove the cliff — $0, do regardless
**Do this NOW; it's the lazy fix that buys months.**

1. Serialize renders: one ComfyUI job at a time (queue depth 1). The
   21.9GB RSS reading is mid-render; the cliff is hit when renders stack.
2. Cap ComfyUI VRAM mode to lowvram permanently (`--lowvram`) and RAM via
   systemd `MemoryMax=12G` — a killed render beats a frozen box.
3. Move render windows off peak: renders between 02:00-08:00 local only
   (cron `workflow_dispatch`/systemd timer), never while TV push + fleet
   lanes run.
4. Keep .wslconfig at 36GB (NOT the 64GB raise) — see crash analysis;
   raising host commit brings back the 9/24 collapse mode.
5. Re-measure: `bash ops/monitoring/radar.sh` weekly — the WARN should drop
   from "cliff documented" to "cliff avoided by serialization".

## Recommendation

C now (free, immediate), A when hardware is possible, B only after the
AppSumo revenue lands. The plan doc for B is intentionally thin: don't build
cloud plumbing before there's money to run it.

## Fleet picture after each option

- Now: 6 (cloud cron lanes) + 1 (Windows always-on tasks) + native box — all
  sharing one 8GB GPU.
- After C: same, but render load serialized → no cliff.
- After A: 6 + 1 + native + render-box (fleet 6+1+native+offloaded) — GPU
  contention zero on box 1.
- After B: burst capacity, box 1 untouched; cost per episode known.
