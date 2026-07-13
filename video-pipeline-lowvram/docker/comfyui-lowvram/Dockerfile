# =============================================================================
# ComfyUI LOW VRAM image — 8GB GPU + 64GB RAM (WSL2)
# Base: nvidia/cuda 12.4.1 runtime + Python 3.11. Fetches ComfyUI + 7 custom
# nodes (incl. ComfyUI-GGUF + VRAM memory management for chunked 8GB gen).
# Model WEIGHTS are NOT baked here — install-lowvram.sh downloads the GGUF
# files into the mounted ./models volume so rebuilds stay fast.
#
# NETWORK FIX (WSL2): the NAT'd WSL network intermittently trips
# `GnuTLS recv error (-9)` on large git pack transfers. git cannot resume a
# broken clone, so we fetch source as CODELOAD TARBALLS via curl with
# --retry 15 --retry-all-errors (smaller than a git clone, clean restart on
# any TLS/connection error). pip gets the same retry treatment for big wheels.
# =============================================================================
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    COMFY_DIR=/root/ComfyUI

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3.11-venv python3-pip git curl ca-certificates build-essential \
        libportaudio2 libxext6 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# ---- ghget: fetch a GitHub repo as a tarball, robust against WSL2 GnuTLS(-9) ----
# Usage: ghget owner/repo destdir
# Tries main then master; curl --retry-all-errors restarts on ANY error (incl.
# the GnuTLS 56 recv error). Tarball has no git history => far less to transfer.
RUN printf '%s\n' '#!/bin/sh' \
    'repo="$1"; dest="$2"; f="/tmp/ghget.tgz"' \
    'mkdir -p "$dest"' \
    'for br in main master; do' \
    '  rm -f "$f"' \
    '  echo "ghget $repo@$br -> $dest"' \
    '  if curl -fL --retry 15 --retry-all-errors --retry-delay 5 --connect-timeout 30 \' \
    '       -o "$f" "https://codeload.github.com/$repo/tar.gz/refs/heads/$br" \' \
    '     && tar xzf "$f" -C "$dest" --strip-components=1; then' \
    '    rm -f "$f"; echo "ghget OK: $repo@$br"; exit 0' \
    '  fi' \
    '  echo "ghget $repo@$br failed; trying next branch"' \
    'done' \
    'rm -f "$f"; echo "FATAL: ghget failed: $repo" >&2; exit 1' \
    > /usr/local/bin/ghget && chmod +x /usr/local/bin/ghget

# ---- pip hardening against WSL2 flaky network (DNS blips, big-wheel stalls) ----
# torch is a 500MB+ wheel; a single connection reset kills the whole build. Give
# pip long timeouts, many retries + resume, and wrap it in a 5x whole-command
# retry (ppip) to ride out transient DNS NameResolutionErrors.
ENV PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10 \
    PIP_RESUME_RETRIES=10
RUN printf '%s\n' '#!/bin/sh' \
    'n=0; until [ $n -ge 5 ]; do' \
    '  pip "$@" && exit 0' \
    '  n=$((n+1)); echo "pip $* failed (attempt $n/5); retrying in $((n*10))s"; sleep $((n*10));' \
    'done; echo "FATAL: pip failed after 5 attempts: $*" >&2; exit 1' \
    > /usr/local/bin/ppip && chmod +x /usr/local/bin/ppip

# ComfyUI lives in a venv so system python stays clean.
RUN python3.11 -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH

WORKDIR ${COMFY_DIR}
# Install CUDA torch FIRST (cu128 = Blackwell/sm_120 kernels for the RTX 5060)
# from the cu128 index so ComfyUI's requirements.txt sees torch already satisfied
# and does NOT pull the 526MB CPU wheel from PyPI. cu128 is MANDATORY here:
# torch<2.7 (cu124) has NO sm_120 kernels and dies with "no kernel image is
# available for execution on the device" on the RTX 5060 (Blackwell).
RUN ghget Comfy-Org/ComfyUI "${COMFY_DIR}" \
    && ppip install --upgrade pip \
    && ppip install torch==2.8.0+cu128 torchvision==0.23.0+cu128 torchaudio==2.8.0+cu128 --index-url https://download.pytorch.org/whl/cu128 \
    && ppip install -r requirements.txt

# ---- custom nodes ----
# LTX-2.3 stack + Chatterbox + ACE-Step + WanVideo + InfiniteTalk + GGUF + LTX-2 VRAM mgmt
# PLUS the nodes the Wan/InfiniteTalk example workflows require:
#   VideoHelperSuite (VHS_VideoCombine), KJNodes (ImageResizeKJv2, GetImageSizeAndCount,
#   GetNode/SetNode/INTConstant), MelBandRoformer (MelBandRoFormerModelLoader/Sampler - audio separation),
#   RES4LYF (ClownSampler_Beta - required by LTX-2.3 single-stage T2V example)
WORKDIR ${COMFY_DIR}/custom_nodes
RUN ghget Lightricks/ComfyUI-LTXVideo ComfyUI-LTXVideo \
 && ghget diodiogod/ComfyUI_ChatterBox_SRT_Voice ComfyUI_ChatterBox_SRT_Voice \
 && ghget ace-step/ACE-Step-ComfyUI ACE-Step-ComfyUI \
 && ghget kijai/ComfyUI-WanVideoWrapper ComfyUI-WanVideoWrapper \
 && ghget xuhongming251/ComfyUI-InfiniteTalk-MultiImage ComfyUI-InfiniteTalk-MultiImage \
 && ghget city96/ComfyUI-GGUF ComfyUI-GGUF \
 && ghget RandomInternetPreson/ComfyUI_LTX-2_VRAM_Memory_Management ComfyUI_LTX-2_VRAM_Memory_Management \
 && ghget Kosinkadink/ComfyUI-VideoHelperSuite ComfyUI-VideoHelperSuite \
 && ghget kijai/ComfyUI-KJNodes ComfyUI-KJNodes \
 && ghget kijai/ComfyUI-MelBandRoFormer ComfyUI-MelBandRoFormer \
 && ghget ClownsharkBatwing/RES4LYF RES4LYF

# per-node python deps (best-effort; some ship none)
RUN for d in ComfyUI-GGUF ComfyUI-LTXVideo ComfyUI-WanVideoWrapper ComfyUI_ChatterBox_SRT_Voice ACE-Step-ComfyUI ComfyUI-VideoHelperSuite ComfyUI-KJNodes ComfyUI-MelBandRoFormer RES4LYF; do \
      if [ -f "$d/requirements.txt" ]; then ppip install -r "$d/requirements.txt"; fi; \
    done

# ---- post-install fixups (Blackwell / torch 2.8.0 compatibility) ----
# 1) LTXVideo needs transformers>=4.50 for Gemma3Config (ships 4.46).
# 2) kornia 0.8.3 segfaults at import under torch 2.8.0 (@torch.jit.script
#    decorators) and dropped pyramid.pad that LTXVideo imports -> strip the
#    jit decorators and add a thin F.pad polyfill.
# 3) ComfyUI_LTX-2_VRAM_Memory_Management has submodule __init__.py files but
#    no parent __init__.py, so ComfyUI skips it -> add an aggregator.
RUN ppip install -q "transformers>=4.50.0" \
 && python - <<'PY'
import re, glob, os
# 2a) strip @torch.jit.script / @torch.jit.export decorators in kornia
kdir = '/opt/venv/lib/python3.11/site-packages/kornia'
for f in glob.glob(os.path.join(kdir, '**', '*.py'), recursive=True):
    s = open(f).read()
    new = re.sub(r'^[ \t]*@torch\.jit\.(script|export)\s*$', '', s, flags=re.M)
    if new != s:
        open(f, 'w').write(new)
# 2b) polyfill pyramid.pad (appended at end to avoid __future__ issues)
pf = os.path.join(kdir, 'geometry/transform/pyramid.py')
ps = open(pf).read()
if 'def pad(' not in ps:
    ps += ('\n\ndef pad(tensor, padding, mode="reflect"):\n'
           '    """Polyfill for kornia<0.8 removed pyramid.pad (thin F.pad wrapper)."""\n'
           '    import torch.nn.functional as _F\n'
           '    return _F.pad(tensor, padding, mode)\n')
    open(pf, 'w').write(ps)
# 3) LTX-2 parent __init__.py aggregator
base = '/root/ComfyUI/custom_nodes/ComfyUI_LTX-2_VRAM_Memory_Management'
submods = ['ltx_multi_gpu_chunked', 'comfyui_tensor_parallel_v3',
           'comfyui_tensor_parallel_v2', 'ComfyUI_LTX2_SeqParallel',
           'sequence_chunked_block']
agg = ('"""Parent aggregator for ComfyUI_LTX-2_VRAM_Memory_Management submodules."""\n\n')
for m in submods:
    agg += ('from .%s import NODE_CLASS_MAPPINGS as _%s, NODE_DISPLAY_NAME_MAPPINGS as _d%s\n'
            % (m, m, m))
agg += '\nNODE_CLASS_MAPPINGS = {}\nNODE_DISPLAY_NAME_MAPPINGS = {}\n'
agg += 'for _m, _dm in ['
agg += ', '.join('(_%s, _d%s)' % (m, m) for m in submods)
agg += ']:\n    NODE_CLASS_MAPPINGS.update(_m)\n    NODE_DISPLAY_NAME_MAPPINGS.update(_dm)\n'
agg += '\n__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]\n'
open(os.path.join(base, '__init__.py'), 'w').write(agg)
print('post-install fixups applied')
PY

WORKDIR ${COMFY_DIR}
EXPOSE 8188
# CLI_ARGS is injected by docker-compose (--lowvram ...). Falls back to listen.
ENTRYPOINT ["sh", "-c", "python main.py ${CLI_ARGS:---listen 0.0.0.0}"]
