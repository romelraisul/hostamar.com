# Hostamar local model router — run guide
# Backend: Docker Model Runner (Docker Desktop, Windows host)
# Router: LiteLLM container on :4000
#
# Your project calls ONE endpoint:
#   base_url = http://localhost:4000/v1
#   api_key  = "anything"
#   model    = "hostamar-own"
#
# hostamar-own auto-routes: fast tasks -> gemma4:E2B, code -> gemma4:12B,
# and if BOTH local models fail -> hy3 cloud (where you may still hit 429).

## 0. One-time: set the cloud key (optional — only needed for fallback)
# In the shell that runs the docker command below, or export in ~/.bashrc:
export KILOCODE_API_KEY=kk-xxxx   # from kilocode.ai dashboard

## 1. Make sure Docker Model Runner is ON
# Docker Desktop > Settings > AI > Enable Docker Model Runner = ON
# (You can also run: docker model gateway  — but LiteLLM is our router, so leave it off.)
# Confirm models are pulled:
docker model list

## 2. Start the LiteLLM router (reads the config we wrote)
docker run -d --name litellm-router -p 4000:4000 ^
  -v /mnt/c/Users/User/hostamar-build/litellm-config.yaml:/app/config.yaml ^
  -e KILOCODE_API_KEY=%KILOCODE_API_KEY% ^
  ghcr.io/berriai/litellm:main-latest ^
  --config /app/config.yaml --port 4000

## 3. Test
curl http://localhost:4000/v1/models
curl http://localhost:4000/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"hostamar-own\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}"

## Notes / gotchas
# - VRAM is 8GB (RTX 5060). Only gemma4:E2B (3.9GB) + gemma4:12B (7GB) fit.
#   Loading both at once leaves ~little headroom; LiteLLM routes one at a time.
# - qwen3.6:27B (17.3GB) and 35B CANNOT load on 8GB. Not in routing.
#   If you get a bigger GPU later: pull it, uncomment the model_group line in
#   litellm-config.yaml, add a hostamar-reasoning entry, restart the container.
# - host.docker.internal resolves from inside the LiteLLM container to your
#   Windows host where Docker Model Runner listens on :12434.
# - The message's original config used `router:`/`fallbacks:` inside
#   litellm_params — that is INVALID and crashes LiteLLM. This file uses the
#   correct top-level `fallbacks:` + `model_group` form.
