export const HOSTAMAR_FREE_MODELS = [
  "auto/best-chat", "auto/best-coding", "auto/best-coding-fast", "auto/best-fast", "auto/best-free", "auto/best-reasoning", "auto/best-vision", "auto/chat", "auto/cheap", "auto/coding", "auto/coding:cheap", "auto/coding:fast", "auto/coding:free", "auto/coding:pro",
  "fb/anthropic/claude-fable-5", "fb/anthropic/claude-fable-5-high", "fb/anthropic/claude-fable-5-low", "fb/anthropic/claude-fable-5-medium", "fb/anthropic/claude-fable-5-xhigh",
  "fb/crof/kimi-k3-eco", "fb/deepseek/deepseek-v4-flash", "fb/deepseek/deepseek-v4-pro",
  "fb/meta/muse-spark-1.2-contributor", "fb/mimo/mimo-v2.5", "fb/minimax/minimax-m3", "fb/z-ai/glm-5.2",
  "freebuff/anthropic/claude-fable-5", "freebuff/anthropic/claude-fable-5-high", "freebuff/anthropic/claude-fable-5-low", "freebuff/anthropic/claude-fable-5-medium", "freebuff/anthropic/claude-fable-5-xhigh",
  "freebuff/crof/kimi-k3-eco", "freebuff/deepseek/deepseek-v4-flash", "freebuff/deepseek/deepseek-v4-pro",
  "freebuff/meta/muse-spark-1.2-contributor", "freebuff/mimo/mimo-v2.5", "freebuff/minimax/minimax-m3", "freebuff/z-ai/glm-5.2",
] as const
// V78 verified lineup (2026-09-25): 36 free cloud aliases above unchanged;
// locals reconciled to on-disk reality — leg 1 (qwen-image-2.1 RGBA) PASS,
// leg 2 (MiniMax H3 ref2video) PASS on the official fp8 DiT, ComfyUI 0.37.0
// reports 1032 nodes. The community nf4 DiT is superseded (broken packed
// kernels), kept as an inventory note only.
export const HOSTAMAR_LOCAL_MODELS = [
  "QwenLocal/qwen-image-2.1-int8 7.26GB+6.31GB RTX5060 8GB best",
  "QwenLocal/qwen-image-2.1-gguf-q5_k_m 4-7GB",
  "QwenLocal/qwen3vl-8b-int8",
  "QwenLocal/openjev-verdict-2.0 1.5G 605529340/303785047 77.10% ECE1.44% replaces Laya 401",
  "QwenLocal/minimax-h3-ref2va-fp8 20.96GB official V78 leg2 PASS 1344x768x39f",
  "QwenLocal/minimax-h3-nf4 16GB community superseded (packed kernels broken on 0.37.0)",
  "QwenLocal/hunyuan-480p-distill",
  "QwenLocal/comfyui-1032-nodes v0.37.0",
] as const
export const HOSTAMAR_ALL = [...HOSTAMAR_FREE_MODELS, ...HOSTAMAR_LOCAL_MODELS]

/**
 * Local-inventory catalog — the models that physically exist on the RTX 5060 box.
 * Every size/path below was verified against disk (docs/WSL_CLEAN_INVENTORY.md,
 * docs/WSL_INVENTORY.md); nothing here is aspirational. Sizes in GB (GiB-rounded).
 * type: llm | video | image | audio | vision | embedding | stt | decision
 */
export type LocalModel = {
  id: string; name: string; type: string; size_gb: number; path: string
  dim?: number; vram_gb?: number; service?: string; status?: string; note?: string
}

// sizes are GiB (binary, 2^30) measured with stat/du on this box — not decimal GB
export const HOSTAMAR_LOCAL_CATALOG: LocalModel[] = [
  // ── video ──
  { id: 'local/minimax-h3-ref2va-fp8', name: 'MiniMax H3 ref2va (fp8 DiT)', type: 'video', size_gb: 19.5, path: 'ComfyUI/models/diffusion_models/minimax_h3_ref2va_pruned_fp8_scaled.safetensors', note: 'official fp8 DiT — V78 leg 2 PASS 1344x768x39f' },
  { id: 'local/minimax-h3-fl2va-nf4', name: 'MiniMax H3 fl2va (NF4)', type: 'video', size_gb: 16.0, path: 'ComfyUI/models/diffusion_models/minimax-h3-fl2va-nf4.safetensors', note: 'community NF4 — packed kernels broken on ComfyUI 0.37.0' },
  { id: 'local/hunyuanvideo1.5-720p-i2v', name: 'HunyuanVideo 1.5 720p i2v cfg-distilled fp8', type: 'video', size_gb: 7.76, path: 'ComfyUI/models/diffusion_models/hunyuanvideo1.5_720p_i2v_cfg_distilled_fp8_scaled.safetensors', status: 'ready', note: 'metadata model_type=hunyuanvideo1.5_720p_i2v_distilled, 1926 tensors' },
  { id: 'local/hunyuanvideo1.5-720p-sr', name: 'HunyuanVideo 1.5 720p SR-distilled fp8', type: 'video', size_gb: 7.76, path: 'ComfyUI/models/diffusion_models/hunyuanvideo1.5_720p_sr_distilled_fp8_scaled.safetensors', note: 'Kijai-style fp8_scaled repack — metadata model_type=hunyuanvideo1.5_720p_sr_distilled, 1932 tensors, structurally complete' },
  { id: 'local/hunyuan-video-720-fp8', name: 'HunyuanVideo 720p fp8 (v1 line)', type: 'video', size_gb: 12.28, path: 'ComfyUI/models/diffusion_models/split_files/diffusion_models/hunyuan_video_720_fp8_e4m3fn.safetensors', note: 'HunyuanVideo v1 line — sits under split_files/, not scanned by ComfyUI flat dirs' },
  // ── audio / TTS ──
  { id: 'local/minimax-music3', name: 'MiniMax Music 3', type: 'audio', size_gb: 18.0, path: 'ComfyUI/models/minimax-music3/' },
  { id: 'local/cosyvoice3-bengali', name: 'CosyVoice 3 — Bengali', type: 'audio', size_gb: 4.13, path: 'ComfyUI/models/cosyvoice3-bengali/' },
  { id: 'local/cosyvoice2', name: 'CosyVoice 2', type: 'audio', size_gb: 4.52, path: 'ComfyUI/models/cosyvoice2/' },
  { id: 'local/chatterbox-multilingual', name: 'Chatterbox Multilingual (23 lang)', type: 'audio', size_gb: 12.91, path: 'ComfyUI/models/chatterbox/' },
  // ── image ──
  { id: 'local/qwen-image-2.1', name: 'Qwen-Image 2.1 (bf16 / int8)', type: 'image', size_gb: 13.3, path: 'ComfyUI/models/diffusion_models/qwen_image_2.1_bf16.safetensors', note: 'int8_convrot variant also on disk (6.8G) — V78 leg 1 PASS' },
  // ── vision / text encoders ──
  { id: 'local/qwen3vl-8b-int8', name: 'Qwen3-VL 8B (int8 convrot)', type: 'vision', size_gb: 8.7, path: 'ComfyUI/models/text_encoders/qwen3vl_8b_int8_convrot.safetensors' },
  { id: 'local/qwen3vl-8b-w4a8', name: 'Qwen3-VL 8B (W4A8)', type: 'vision', size_gb: 5.9, path: 'ComfyUI/models/text_encoders/qwen3vl_8b_w4a8.safetensors' },
  { id: 'local/qwen3vl-32b-minimax-h3-nvfp4-awq', name: 'Qwen3-VL 32B — MiniMax H3 encoder (NVFP4 AWQ)', type: 'vision', size_gb: 14.6, path: 'ComfyUI/models/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors' },
  // ── local LLMs (llama.cpp / Ollama) ──
  { id: 'local/bonsai-27b-pq2', name: 'Bonsai (Prism) 27B pq2 — GGUF', type: 'llm', size_gb: 6.8, path: 'bonsai2/27b/27b-pq2.gguf', service: 'prism-bonsai.service :18932', note: 'PRIJOM/Prism Bonsai local server' },
  { id: 'local/qwen3.8-27b-q4-k-xl', name: 'Qwen3.8 27B UD-Q4_K_XL — GGUF', type: 'llm', size_gb: 16.4, path: 'models/Qwen3.8-27B/Qwen3.8-27B-UD-Q4_K_XL.gguf', service: 'qwen-local.service :8999' },
  { id: 'local/sdxl-turbo-1.0-fp16', name: 'SDXL-Turbo 1.0 fp16', type: 'image', size_gb: 6.5, path: 'ComfyUI/models/checkpoints/sd_xl_turbo_1.0_fp16.safetensors', service: 'litserve_gateway :11445' },
  { id: 'local/llava-llama-3-8b-v1.1', name: 'LLaVA Llama-3 8B v1.1 (transformers)', type: 'vision', size_gb: 15.7, path: 'ComfyUI/models/LLM/llava-llama-3-8b-v1_1-transformers/' },
  { id: 'local/llava-llama-3-8b-text-encoder', name: 'LLaVA Llama-3 8B text-encoder-tokenizer', type: 'llm', size_gb: 15.0, path: 'ComfyUI/models/LLM/llava-llama-3-8b-text-encoder-tokenizer/' },
  { id: 'local/openjev-verdict-2.0', name: 'OpenJEV Verdict 2.0 (Bengali verdict scorer)', type: 'llm', size_gb: 1.41, path: 'ComfyUI/models/openjev-verdict-2.0/', note: '605529340/303785047 77.10% acc, ECE 1.44%' },
  // ── decision (typed decisions + calibrated confidence — the 6 PIN audit layer) ──
  { id: 'local/jev-decision-0.8b', name: 'JEV Decision 0.8B (Jev-Style v3, Q4_K_M)', type: 'decision', size_gb: 0.49, path: 'models/jev/Jev-Style-0.8B-Decision-v3-Q4_K_M.gguf', service: 'hostamar-jev.service :8083 /v1/decisions (public https://decisions.hostamar.com) + hostamar-jev-model.service :8085 official jev-style scorer', note: '386M params, single forward pass + linear probe, calibrated temperature 0.88, confidence=(k*pmax-1)/(k-1); 20-50ms warm / 0.2-0.9s cold; conf<0.60 escalates to balanced + human review; two-judge (judge2 = prism-bonsai :18932) agree -> auto-tag; serves the 6 decision points PIN1-6; upstream repo chaoliangUNSW/Jev-Style-0.8B-Decision-v3-GGUF' },
  // ── speech-to-text ──
  { id: 'local/bengali-whisper-medium', name: 'Bengali Whisper Medium', type: 'stt', size_gb: 2.9, path: 'models/bengali-whisper-medium/model.safetensors' },
  // ── embeddings (Ollama, :11434, auto-routed by the :8081 router) ──
  { id: 'local/nomic-embed-text', name: 'nomic-embed-text', type: 'embedding', size_gb: 0.26, dim: 768, path: 'ollama', service: ':11434', note: 'long input (>2000 chars)' },
  { id: 'local/bge-m3', name: 'bge-m3', type: 'embedding', size_gb: 1.08, dim: 1024, path: 'ollama', service: ':11434', note: 'বাংলা script' },
  { id: 'local/mxbai-embed-large', name: 'mxbai-embed-large', type: 'embedding', size_gb: 0.62, dim: 1024, path: 'ollama', service: ':11434', note: 'default English' },
  { id: 'local/all-minilm', name: 'all-minilm', type: 'embedding', size_gb: 0.04, dim: 384, path: 'ollama', service: ':11434', note: 'short input (<=100 chars)' },
]
