#!/usr/bin/env bash
# =============================================================================
# install.sh — ComfyUI custom-node install (mirrors the brief's copy-paste list).
# Run INSIDE the comfyui container at /app/ComfyUI/custom_nodes, OR on a host
# ComfyUI install. Safe to re-run (git clone skips existing dirs).
# After cloning, installs each node's requirements.txt when present.
# =============================================================================
set -euo pipefail

NODES_DIR="${1:-$(pwd)}"
COMFY_DIR="$(cd "$NODES_DIR/.." && pwd)"
echo ">> ComfyUI root: $COMFY_DIR"
echo ">> Installing custom nodes into: $NODES_DIR"
cd "$NODES_DIR"

clone() {
  local url="$1"; local name; name="$(basename "$url" .git)"
  if [ -d "$name" ]; then echo "   skip (exists): $name"; else git clone "$url"; fi
}

clone https://github.com/Lightricks/ComfyUI-LTXVideo
clone https://github.com/diodiogod/ComfyUI_ChatterBox_SRT_Voice
clone https://github.com/ace-step/ACE-Step-ComfyUI
clone https://github.com/kijai/ComfyUI-WanVideoWrapper
clone https://github.com/xuhongming251/ComfyUI-InfiniteTalk-MultiImage

echo ">> Installing python requirements per node (uses active venv)..."
for d in ComfyUI-LTXVideo ComfyUI_ChatterBox_SRT_Voice ACE-Step-ComfyUI ComfyUI-WanVideoWrapper ComfyUI-InfiniteTalk-MultiImage; do
  if [ -f "$d/requirements.txt" ]; then
    echo "   pip install -r $d/requirements.txt"
    pip install -r "$d/requirements.txt" || echo "   !! $d requirements failed (continue)"
  fi
done

echo ">> Common heavy deps..."
pip install "transformers>=4.44" "diffusers>=0.30" torchaudio sentencepiece "numpy<2" safetensors "huggingface_hub[cli]" accelerate soundfile librosa || true

echo ">> Done. Restart ComfyUI to load new nodes."
