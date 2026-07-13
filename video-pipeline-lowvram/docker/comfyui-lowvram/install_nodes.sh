#!/usr/bin/env bash
# =============================================================================
# install_nodes.sh (inside image build) — clone the 7 custom nodes.
# Kept separate for readability; invoked by Dockerfile. Not run on host.
# =============================================================================
set -euo pipefail
cd /root/ComfyUI/custom_nodes
git clone https://github.com/Lightricks/ComfyUI-LTXVideo.git
git clone https://github.com/diodiogod/ComfyUI_ChatterBox_SRT_Voice.git
git clone https://github.com/ace-step/ACE-Step-ComfyUI.git
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git
git clone https://github.com/xuhongming251/ComfyUI-InfiniteTalk-MultiImage.git
git clone https://github.com/city96/ComfyUI-GGUF.git
git clone https://github.com/RandomInternetPreson/ComfyUI_LTX-2_VRAM_Memory_Management.git
echo "7 custom nodes cloned."
