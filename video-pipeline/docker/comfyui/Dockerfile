# =============================================================================
# ComfyUI GPU render image — hostamar video pipeline
# Base: nvidia/cuda 12.4.1 + Python 3.11. Installs ComfyUI + the 5 custom nodes
# from the brief, then an entrypoint downloads the real model weights from
# HuggingFace (needs HF_TOKEN with gated-model access where required).
# Build: docker compose build comfyui_main   (context ./docker/comfyui)
# =============================================================================
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    COMFYUI_DIR=/app/ComfyUI \
    NODES_DIR=/app/ComfyUI/custom_nodes \
    MODELS_DIR=/app/ComfyUI/models

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3.11-venv python3.11-dev python3-pip \
        git git-lfs ffmpeg \
        build-essential g++ wget ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/pip pip /usr/bin/python3.11 1

# git-lfs required for several model repos
RUN git lfs install

WORKDIR /app
RUN git clone https://github.com/Comfy-Org/ComfyUI.git ComfyUI

# Create venv and install ComfyUI core deps
RUN python -m venv /opt/venv && . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    cd ComfyUI && pip install -r requirements.txt

# ---- Custom nodes (from the brief) ----
WORKDIR ${NODES_DIR}
RUN . /opt/venv/bin/activate && \
    git clone https://github.com/Lightricks/ComfyUI-LTXVideo && \
    git clone https://github.com/diodiogod/ComfyUI_ChatterBox_SRT_Voice && \
    git clone https://github.com/ace-step/ACE-Step-ComfyUI && \
    git clone https://github.com/kijai/ComfyUI-WanVideoWrapper && \
    git clone https://github.com/xuhongming251/ComfyUI-InfiniteTalk-MultiImage

# Install each node's python deps (some add transformers/torchaudio diffusers etc.)
RUN . /opt/venv/bin/activate && \
    for d in ComfyUI-LTXVideo ComfyUI_ChatterBox_SRT_Voice ACE-Step-ComfyUI ComfyUI-WanVideoWrapper ComfyUI-InfiniteTalk-MultiImage; do \
        if [ -f "$d/requirements.txt" ]; then echo ">> pip install $d"; pip install -r "$d/requirements.txt"; fi; \
    done

# Pre-install common heavy deps the nodes rely on (idempotent if already present)
RUN . /opt/venv/bin/activate && pip install \
    "transformers>=4.44" "diffusers>=0.30" "torchaudio" "sentencepiece" \
    "numpy<2" "safetensors" "huggingface_hub[cli]" "accelerate" "soundfile" "librosa"

# Entrypoint downloads real weights (see entrypoint.sh). It is NOT run at build
# time so the image stays cacheable; weights land in the mounted ./models volume.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PATH="/opt/venv/bin:${PATH}"
EXPOSE 8188 8189
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--highvram"]
