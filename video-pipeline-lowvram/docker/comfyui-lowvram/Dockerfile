# =============================================================================
# ComfyUI LOW VRAM image — 8GB GPU + 64GB RAM (WSL2)
# Base: nvidia/cuda 12.4.1 runtime + Python 3.11. Clones ComfyUI + 7 custom
# nodes (incl. ComfyUI-GGUF + VRAM memory management for chunked 8GB gen).
# Model WEIGHTS are NOT baked here — install-lowvram.sh downloads the GGUF
# files into the mounted ./models volume so rebuilds stay fast.
# =============================================================================
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    COMFY_DIR=/root/ComfyUI

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3.11-venv python3-pip git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ComfyUI lives in a venv so system python stays clean.
RUN python3.11 -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH

WORKDIR ${COMFY_DIR}
RUN git clone https://github.com/Comfy-Org/ComfyUI.git . \
    && pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

# ---- 7 custom nodes (5 original + 2 required-for-8GB) ----
WORKDIR ${COMFY_DIR}/custom_nodes
RUN git clone https://github.com/Lightricks/ComfyUI-LTXVideo.git \
 && git clone https://github.com/diodiogod/ComfyUI_ChatterBox_SRT_Voice.git \
 && git clone https://github.com/ace-step/ACE-Step-ComfyUI.git \
 && git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git \
 && git clone https://github.com/xuhongming251/ComfyUI-InfiniteTalk-MultiImage.git \
 && git clone https://github.com/city96/ComfyUI-GGUF.git \
 && git clone https://github.com/RandomInternetPreson/ComfyUI_LTX-2_VRAM_Memory_Management.git

# per-node python deps (best-effort; some ship none)
RUN for d in ComfyUI-GGUF ComfyUI-LTXVideo ComfyUI-WanVideoWrapper ComfyUI_ChatterBox_SRT_Voice ACE-Step-ComfyUI; do \
      if [ -f "$d/requirements.txt" ]; then pip install -r "$d/requirements.txt"; fi; \
    done

WORKDIR ${COMFY_DIR}
EXPOSE 8188
# CLI_ARGS is injected by docker-compose (--lowvram ...). Falls back to listen.
ENTRYPOINT ["sh", "-c", "python main.py ${CLI_ARGS:---listen 0.0.0.0}"]
