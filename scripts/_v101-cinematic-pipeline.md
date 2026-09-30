Pipeline V101 Super Cinematic:
- Qwen 2.1 bf16 14G → ref image 768x1344 anamorphic golden hour film grain
- H3 ref2va 20G 129f 5.875s → 6 clips
- HunyuanVideo 1.5 fp8 7.8G + SR → upscale 384x216 → 1080x1920 9:16
- Chatterbox TTS primary emotion 0.7 cfg 0.5 — mixed Bangla+English — fallback CosyVoice3-Bengali 5.1G + edge-tts
- MiniMax Music 3 → dark cinematic ambient 30s BGM per script — duck -14dB under VO
- Captions HostamarBangla white bold bottom + black stroke
- RAM guard stop qwen-local + prism-bonsai before render + NODE_OPTIONS ipv4first + timeout 10000 for B2 PUT
