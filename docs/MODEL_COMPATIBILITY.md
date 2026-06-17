# Model Compatibility Matrix for RTX 5060 (8GB VRAM)

| Model | Parameters | Quantization | Size | Runner | Works on 8GB? | Speed | Notes |
|-------|-----------|-------------|------|--------|---------------|-------|-------|
| **smollm3:F16** | 3B | F16 | 5.73GB | DMR / Ollama | ✅ Yes | Fast | Best for daily use |
| **hermes3** | ~7B | Q4_K_M | 4.7GB | Ollama | ✅ Yes | Fast | Good fallback |
| **qwen3.6:27B** | 27B | Q4_K_M | 16.39GB | DMR | ❌ No (VRAM) | - | Use via API only |
| **seed-oss:36B-UD-IQ1_M** | 36B | IQ4_NL | 8.45GB | DMR | ⚠️ Borderline | Slow | May crash GPU |
| **stable-diffusion:latest** | - | - | 6.94GB | DMR | ❌ No (diffusers missing) | - | Needs Linux for DMR, or run SD WebUI separately |

## Recommended Setup

### Primary (always available)
- **smollm3:F16** — 5.73GB, fits comfortably, fast responses
- **hermes3** (Ollama) — 4.7GB, GPU accelerated

### Conditional (use when primary fails)
- **qwen3.6:27B** — requires Docker Model Runner, will use CPU fallback if GPU OOM
- **seed-oss:36B** — only in emergency, very slow on 8GB GPU

### Will NOT run locally
- Any model > 10GB raw size
- Diffusers/image models via Docker Model Runner (Windows limitation)

## Cloud Fallback
When no local model responds, the system falls back to OpenAI:
- gpt-4o-mini (requires OPENAI_API_KEY)
- gpt-3.5-turbo (requires OPENAI_API_KEY)
