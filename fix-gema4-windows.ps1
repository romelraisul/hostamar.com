# fix-gema4-windows.ps1
# Windows-side Ollama + Docker Model Runner gema4 setup (run via OpenClaw exec).
# NOTE: on this box Ollama runs in WSL, not Windows. This script is kept for
# parity / when Ollama is installed on Windows. It is idempotent.
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "ollama not on Windows PATH; Ollama is served from WSL. Skipping Windows pull."
    exit 0
}
ollama pull gemma3:12b
ollama cp gemma3:12b gema4:12b
ollama pull codegemma:7b
ollama cp codegemma:7b gema4-code:12b
docker model pull ai/gemma3:12B-F16 -ErrorAction SilentlyContinue
docker restart litellm-play
Write-Host "windows gema4 setup done"
