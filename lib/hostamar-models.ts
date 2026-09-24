export const HOSTAMAR_FREE_MODELS = [
  "auto/best-chat", "auto/best-coding", "auto/best-coding-fast", "auto/best-fast", "auto/best-free", "auto/best-reasoning", "auto/best-vision", "auto/chat", "auto/cheap", "auto/coding", "auto/coding:cheap", "auto/coding:fast", "auto/coding:free", "auto/coding:pro",
  "fb/anthropic/claude-fable-5", "fb/anthropic/claude-fable-5-high", "fb/anthropic/claude-fable-5-low", "fb/anthropic/claude-fable-5-medium", "fb/anthropic/claude-fable-5-xhigh",
  "fb/crof/kimi-k3-eco", "fb/deepseek/deepseek-v4-flash", "fb/deepseek/deepseek-v4-pro",
  "fb/meta/muse-spark-1.2-contributor", "fb/mimo/mimo-v2.5", "fb/minimax/minimax-m3", "fb/z-ai/glm-5.2",
  "freebuff/anthropic/claude-fable-5", "freebuff/anthropic/claude-fable-5-high", "freebuff/anthropic/claude-fable-5-low", "freebuff/anthropic/claude-fable-5-medium", "freebuff/anthropic/claude-fable-5-xhigh",
  "freebuff/crof/kimi-k3-eco", "freebuff/deepseek/deepseek-v4-flash", "freebuff/deepseek/deepseek-v4-pro",
  "freebuff/meta/muse-spark-1.2-contributor", "freebuff/mimo/mimo-v2.5", "freebuff/minimax/minimax-m3", "freebuff/z-ai/glm-5.2",
] as const
export const HOSTAMAR_LOCAL_MODELS = [
  "QwenLocal/qwen-image-2.1-int8 7.26GB+6.31GB RTX5060 8GB best",
  "QwenLocal/qwen-image-2.1-gguf-q5_k_m 4-7GB",
  "QwenLocal/qwen3vl-8b-int8",
  "QwenLocal/openjev-verdict-2.0 1.5G 605529340/303785047 77.10% ECE1.44% replaces Laya 401",
  "QwenLocal/minimax-h3-nf4 16GB + turbo-lora",
  "QwenLocal/hunyuan-480p-distill",
  "QwenLocal/comfyui-978-nodes",
] as const
export const HOSTAMAR_ALL = [...HOSTAMAR_FREE_MODELS, ...HOSTAMAR_LOCAL_MODELS]
