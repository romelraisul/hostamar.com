# Real-ESRGAN (V33 video upscale)

Binary + models NOT committed (45MB exe + 67MB models). One-time setup:

    curl -sL -o /tmp/realesrgan.zip 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip'
    unzip -o /tmp/realesrgan.zip -d /tmp
    mkdir -p tools/realesrgan
    cp /tmp/realesrgan-ncnn-vulkan.exe /tmp/vcomp140.dll /tmp/vcomp140d.dll tools/realesrgan/
    cp -r /tmp/models tools/realesrgan/

Notes (verified 2026-09-03 on the RTX 5060 box):
- IMAGES only — no video input support in this build ("invalid outputpath
  extension type" on .mp4 -o). The worker extracts frames, runs ESR on the
  frames dir, reassembles with nvenc.
- MUST pass `-g 0` (NVIDIA). Default auto-pick selects the AMD iGPU (device 1).
- 0.85s/frame at 384x224 -> 1536x896 with ComfyUI resident (GPU is shared).
- Path args must be Windows paths when invoked from Windows node/PowerShell.
- Get the FULL Noto Sans Bengali Bold from notofonts.github.io (hinted/ttf) —
  the 200KB "NotoSansBengali.ttf" floating around is a 96-glyph subset with
  NO half-form GSUB features (broken conjuncts, uharfbuzz-proven).
