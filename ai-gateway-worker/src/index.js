/**
 * Hostamar AI Gateway — always-on model catalog + free-model chat proxy.
 * Serves ai.hostamar.com/* from Cloudflare edge (works when the home VPS is off).
 *
 * GET  /v1/models            -> embedded catalog (124 models, [ctx] labels)
 * POST /v1/chat/completions  -> Hostamar JWT auth -> Kilo free gateway proxy
 *                               paid models hard-blocked; fallback minimax-m3:free
 */

const CATALOG = [{"id":"hostamar-1m-a","provider":"hostamar","context":"1M","context_length":1048576,"free":false,"displayName":"hostamar-1m-a [1M]"},{"id":"hostamar-1m-b","provider":"hostamar","context":"1M","context_length":1048576,"free":false,"displayName":"hostamar-1m-b [1M]"},{"id":"meituan/longcat-2.0-free","provider":"kilo","context":"1M","context_length":1048756,"free":true,"displayName":"meituan/longcat-2.0-free [1M]"},{"id":"minimax/minimax-m3:free","provider":"openrouter","context":"1M","context_length":1048576,"free":true,"displayName":"minimax/minimax-m3:free [1M]"},{"id":"opencode/hy3-free","provider":"opencode","context":"1M","context_length":1048576,"free":true,"displayName":"opencode/hy3-free [1M]"},{"id":"opencode/mimo-v2.5-free","provider":"opencode","context":"1M","context_length":1048576,"free":true,"displayName":"opencode/mimo-v2.5-free [1M]"},{"id":"opencode/nemotron-3-ultra-free","provider":"opencode","context":"1M","context_length":1048576,"free":true,"displayName":"opencode/nemotron-3-ultra-free [1M]"},{"id":"opencode/nemotron-3.5-lightning-free","provider":"opencode","context":"1M","context_length":1048576,"free":true,"displayName":"opencode/nemotron-3.5-lightning-free [1M]"},{"id":"opencode/x-preview-f-free","provider":"opencode","context":"1M","context_length":1048576,"free":true,"displayName":"opencode/x-preview-f-free [1M]"},{"id":"stealth/ox-alpha","provider":"kilo","context":"1M","context_length":1048576,"free":true,"displayName":"stealth/ox-alpha [1M]"},{"id":"thinkingmachines/inkling-small:free","provider":"openrouter","context":"1M","context_length":1048576,"free":true,"displayName":"thinkingmachines/inkling-small:free [1M]"},{"id":"thinkingmachines/inkling:free","provider":"openrouter","context":"1M","context_length":1048576,"free":true,"displayName":"thinkingmachines/inkling:free [1M]"},{"id":"nvidia/nemotron-3-ultra-550b-a55b:free","provider":"openrouter","context":"1M","context_length":1000000,"free":true,"displayName":"nvidia/nemotron-3-ultra-550b-a55b:free [1M]"},{"id":"nvidia/nemotron-3.5-lightning:free","provider":"openrouter","context":"1M","context_length":1000000,"free":true,"displayName":"nvidia/nemotron-3.5-lightning:free [1M]"},{"id":"dots-studio/dots-3-note-preview:free","provider":"openrouter","context":"512K","context_length":512000,"free":true,"displayName":"dots-studio/dots-3-note-preview:free [512K]"},{"id":"google/gemma-4-26b-a4b-it:free","provider":"openrouter","context":"262K","context_length":262144,"free":true,"displayName":"google/gemma-4-26b-a4b-it:free [262K]"},{"id":"google/gemma-4-31b-it:free","provider":"openrouter","context":"262K","context_length":262144,"free":true,"displayName":"google/gemma-4-31b-it:free [262K]"},{"id":"nvidia/nemotron-3-super-120b-a12b:free","provider":"openrouter","context":"262K","context_length":262144,"free":true,"displayName":"nvidia/nemotron-3-super-120b-a12b:free [262K]"},{"id":"opencode/laguna-s-2.1-free","provider":"opencode","context":"262K","context_length":262144,"free":true,"displayName":"opencode/laguna-s-2.1-free [262K]"},{"id":"poolside/laguna-s-2.1:free","provider":"openrouter","context":"262K","context_length":262144,"free":true,"displayName":"poolside/laguna-s-2.1:free [262K]"},{"id":"poolside/laguna-xs-2.1:free","provider":"openrouter","context":"262K","context_length":262144,"free":true,"displayName":"poolside/laguna-xs-2.1:free [262K]"},{"id":"stepfun/step-3.7-flash:free","provider":"kilo","context":"262K","context_length":262144,"free":true,"displayName":"stepfun/step-3.7-flash:free [262K]"},{"id":"tencent/hy3:free","provider":"kilo","context":"262K","context_length":262144,"free":true,"displayName":"tencent/hy3:free [262K]"},{"id":"cohere/north-mini-code:free","provider":"openrouter","context":"256K","context_length":256000,"free":true,"displayName":"cohere/north-mini-code:free [256K]"},{"id":"kilo-auto/free","provider":"kilo","context":"256K","context_length":256000,"free":true,"displayName":"kilo-auto/free [256K]"},{"id":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free","provider":"openrouter","context":"256K","context_length":256000,"free":true,"displayName":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free [256K]"},{"id":"z-ai/glm-5.2:free","provider":"openrouter","context":"256K","context_length":256000,"free":true,"displayName":"z-ai/glm-5.2:free [256K]"},{"id":"openrouter/free","provider":"openrouter","context":"200K","context_length":200000,"free":true,"displayName":"openrouter/free [200K]"},{"id":"minimax/minimax-m2.7:free","provider":"openrouter","context":"197K","context_length":196608,"free":true,"displayName":"minimax/minimax-m2.7:free [197K]"},{"id":"nvidia/nemotron-3.5-content-safety:free","provider":"openrouter","context":"128K","context_length":128000,"free":true,"displayName":"nvidia/nemotron-3.5-content-safety:free [128K]"},{"id":"liquid/lfm-2.5-2.6b:free","provider":"openrouter","context":"66K","context_length":65536,"free":true,"displayName":"liquid/lfm-2.5-2.6b:free [66K]"},{"id":"deepseek/deepseek-v4-flash-0731","provider":"openrouter","context":"1.3M","context_length":1310720,"free":false,"displayName":"deepseek/deepseek-v4-flash-0731 [1.3M]"},{"id":"meta/muse-spark-1.2","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"meta/muse-spark-1.2 [1M]"},{"id":"minimaxai/minimax-m3","provider":"nvidia","context":"1M","context_length":1048576,"free":false,"displayName":"minimaxai/minimax-m3 [1M]"},{"id":"moonshotai/kimi-k3","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"moonshotai/kimi-k3 [1M]"},{"id":"poolside/laguna-s-2.1","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"poolside/laguna-s-2.1 [1M]"},{"id":"thinkingmachines/inkling","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"thinkingmachines/inkling [1M]"},{"id":"thinkingmachines/inkling-small","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"thinkingmachines/inkling-small [1M]"},{"id":"z-ai/glm-5.3","provider":"openrouter","context":"1M","context_length":1048576,"free":false,"displayName":"z-ai/glm-5.3 [1M]"},{"id":"minimax/minimax-m1","provider":"openrouter","context":"1M","context_length":1000000,"free":false,"displayName":"minimax/minimax-m1 [1M]"},{"id":"nvidia/nemotron-3-super-120b-a12b","provider":"nvidia","context":"1M","context_length":1000000,"free":false,"displayName":"nvidia/nemotron-3-super-120b-a12b [1M]"},{"id":"qwen/qwen3.7-flash","provider":"openrouter","context":"1M","context_length":1000000,"free":false,"displayName":"qwen/qwen3.7-flash [1M]"},{"id":"qwen/qwen3.8-max","provider":"openrouter","context":"1M","context_length":1000000,"free":false,"displayName":"qwen/qwen3.8-max [1M]"},{"id":"nvidia/nemotron-3-ultra-550b-a55b","provider":"nvidia","context":"512K","context_length":512288,"free":false,"displayName":"nvidia/nemotron-3-ultra-550b-a55b [512K]"},{"id":"x-ai/grok-4.6","provider":"openrouter","context":"500K","context_length":500000,"free":false,"displayName":"x-ai/grok-4.6 [500K]"},{"id":"google/gemma-4-31b-it","provider":"openrouter","context":"262K","context_length":262144,"free":false,"displayName":"google/gemma-4-31b-it [262K]"},{"id":"moonshotai/kimi-k2.6","provider":"openrouter","context":"262K","context_length":262144,"free":false,"displayName":"moonshotai/kimi-k2.6 [262K]"},{"id":"nvidia/nemotron-3-nano-30b-a3b","provider":"nvidia","context":"262K","context_length":262144,"free":false,"displayName":"nvidia/nemotron-3-nano-30b-a3b [262K]"},{"id":"poolside/laguna-xs-2.1","provider":"openrouter","context":"262K","context_length":262144,"free":false,"displayName":"poolside/laguna-xs-2.1 [262K]"},{"id":"ai21labs/jamba-1.5-large-instruct","provider":"nvidia","context":"256K","context_length":256000,"free":false,"displayName":"ai21labs/jamba-1.5-large-instruct [256K]"},{"id":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning","provider":"nvidia","context":"256K","context_length":256000,"free":false,"displayName":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning [256K]"},{"id":"deepseek-ai/deepseek-v4-flash-0731","provider":"nvidia","context":"164K","context_length":163840,"free":false,"displayName":"deepseek-ai/deepseek-v4-flash-0731 [164K]"},{"id":"google/gemma-3-12b-it","provider":"nvidia","context":"131K","context_length":131072,"free":false,"displayName":"google/gemma-3-12b-it [131K]"},{"id":"google/gemma-3-4b-it","provider":"nvidia","context":"131K","context_length":131072,"free":false,"displayName":"google/gemma-3-4b-it [131K]"},{"id":"meta/muse-glimmer-30b","provider":"openrouter","context":"131K","context_length":131072,"free":false,"displayName":"meta/muse-glimmer-30b [131K]"},{"id":"openai/gpt-oss-120b","provider":"openrouter","context":"131K","context_length":131072,"free":false,"displayName":"openai/gpt-oss-120b [131K]"},{"id":"openai/gpt-oss-20b","provider":"openrouter","context":"131K","context_length":131072,"free":false,"displayName":"openai/gpt-oss-20b [131K]"},{"id":"ibm/granite-3.0-8b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"ibm/granite-3.0-8b-instruct [128K]"},{"id":"ibm/granite-8b-code-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"ibm/granite-8b-code-instruct [128K]"},{"id":"meta/llama-3.1-70b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.1-70b-instruct [128K]"},{"id":"meta/llama-3.1-8b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.1-8b-instruct [128K]"},{"id":"meta/llama-3.2-11b-vision-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.2-11b-vision-instruct [128K]"},{"id":"meta/llama-3.2-1b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.2-1b-instruct [128K]"},{"id":"meta/llama-3.2-3b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.2-3b-instruct [128K]"},{"id":"meta/llama-3.2-90b-vision-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.2-90b-vision-instruct [128K]"},{"id":"meta/llama-3.3-70b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"meta/llama-3.3-70b-instruct [128K]"},{"id":"microsoft/phi-3-vision-128k-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"microsoft/phi-3-vision-128k-instruct [128K]"},{"id":"microsoft/phi-3.5-moe-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"microsoft/phi-3.5-moe-instruct [128K]"},{"id":"mistralai/mistral-large","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"mistralai/mistral-large [128K]"},{"id":"mistralai/mistral-large-2-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"mistralai/mistral-large-2-instruct [128K]"},{"id":"mistralai/mistral-nemotron","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"mistralai/mistral-nemotron [128K]"},{"id":"nv-mistralai/mistral-nemo-12b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nv-mistralai/mistral-nemo-12b-instruct [128K]"},{"id":"nvidia/cosmos-reason2-8b","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/cosmos-reason2-8b [128K]"},{"id":"nvidia/llama-3.1-nemotron-51b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.1-nemotron-51b-instruct [128K]"},{"id":"nvidia/llama-3.1-nemotron-70b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.1-nemotron-70b-instruct [128K]"},{"id":"nvidia/llama-3.1-nemotron-nano-8b-v1","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.1-nemotron-nano-8b-v1 [128K]"},{"id":"nvidia/llama-3.1-nemotron-nano-vl-8b-v1","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.1-nemotron-nano-vl-8b-v1 [128K]"},{"id":"nvidia/llama-3.1-nemotron-ultra-253b-v1","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.1-nemotron-ultra-253b-v1 [128K]"},{"id":"nvidia/llama-3.3-nemotron-super-49b-v1","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.3-nemotron-super-49b-v1 [128K]"},{"id":"nvidia/llama-3.3-nemotron-super-49b-v1.5","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/llama-3.3-nemotron-super-49b-v1.5 [128K]"},{"id":"nvidia/nemotron-3.5-lightning-30b-a3b","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/nemotron-3.5-lightning-30b-a3b [128K]"},{"id":"nvidia/nemotron-nano-12b-v2-vl","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/nemotron-nano-12b-v2-vl [128K]"},{"id":"nvidia/nemotron-nano-3-30b-a3b","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/nemotron-nano-3-30b-a3b [128K]"},{"id":"nvidia/nvidia-nemotron-nano-9b-v2","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/nvidia-nemotron-nano-9b-v2 [128K]"},{"id":"nvidia/vila","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"nvidia/vila [128K]"},{"id":"writer/palmyra-creative-122b","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"writer/palmyra-creative-122b [128K]"},{"id":"writer/palmyra-med-70b","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"writer/palmyra-med-70b [128K]"},{"id":"zyphra/zamba2-7b-instruct","provider":"nvidia","context":"128K","context_length":128000,"free":false,"displayName":"zyphra/zamba2-7b-instruct [128K]"},{"id":"mistralai/mixtral-8x22b-v0.1","provider":"nvidia","context":"64K","context_length":64000,"free":false,"displayName":"mistralai/mixtral-8x22b-v0.1 [64K]"},{"id":"hostamar-own","provider":"hostamar","context":"33K","context_length":32768,"free":false,"displayName":"hostamar-own [33K]"},{"id":"minimax-m3","provider":"hostamar","context":"33K","context_length":32768,"free":false,"displayName":"minimax-m3 [33K]"},{"id":"01-ai/yi-large","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"01-ai/yi-large [32K]"},{"id":"databricks/dbrx-instruct","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"databricks/dbrx-instruct [32K]"},{"id":"mistralai/codestral-22b-instruct-v0.1","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"mistralai/codestral-22b-instruct-v0.1 [32K]"},{"id":"mistralai/mistral-7b-instruct-v0.3","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"mistralai/mistral-7b-instruct-v0.3 [32K]"},{"id":"stepfun-ai/step-3.7-flash","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"stepfun-ai/step-3.7-flash [32K]"},{"id":"writer/palmyra-fin-70b-32k","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"writer/palmyra-fin-70b-32k [32K]"},{"id":"writer/palmyra-med-70b-32k","provider":"nvidia","context":"32K","context_length":32000,"free":false,"displayName":"writer/palmyra-med-70b-32k [32K]"},{"id":"bigcode/starcoder2-15b","provider":"nvidia","context":"16K","context_length":16000,"free":false,"displayName":"bigcode/starcoder2-15b [16K]"},{"id":"deepseek-ai/deepseek-coder-6.7b-instruct","provider":"nvidia","context":"16K","context_length":16000,"free":false,"displayName":"deepseek-ai/deepseek-coder-6.7b-instruct [16K]"},{"id":"meta/codellama-70b","provider":"nvidia","context":"16K","context_length":16000,"free":false,"displayName":"meta/codellama-70b [16K]"},{"id":"google/codegemma-1.1-7b","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"google/codegemma-1.1-7b [8K]"},{"id":"google/codegemma-7b","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"google/codegemma-7b [8K]"},{"id":"google/gemma-2b","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"google/gemma-2b [8K]"},{"id":"google/recurrentgemma-2b","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"google/recurrentgemma-2b [8K]"},{"id":"ibm/granite-34b-code-instruct","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"ibm/granite-34b-code-instruct [8K]"},{"id":"nvidia/llama3-chatqa-1.5-70b","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"nvidia/llama3-chatqa-1.5-70b [8K]"},{"id":"nvidia/mistral-nemo-minitron-8b-8k-instruct","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"nvidia/mistral-nemo-minitron-8b-8k-instruct [8K]"},{"id":"nvidia/nemotron-parse","provider":"nvidia","context":"8K","context_length":8000,"free":false,"displayName":"nvidia/nemotron-parse [8K]"},{"id":"meta/llama2-70b","provider":"nvidia","context":"4K","context_length":4096,"free":false,"displayName":"meta/llama2-70b [4K]"},{"id":"microsoft/kosmos-2","provider":"nvidia","context":"4K","context_length":4096,"free":false,"displayName":"microsoft/kosmos-2 [4K]"},{"id":"aisingapore/sea-lion-7b-instruct","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"aisingapore/sea-lion-7b-instruct [4K]"},{"id":"ibm/granite-3.0-3b-a800m-instruct","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"ibm/granite-3.0-3b-a800m-instruct [4K]"},{"id":"nvidia/nemotron-4-340b-instruct","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/nemotron-4-340b-instruct [4K]"},{"id":"nvidia/nemotron-4-340b-reward","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/nemotron-4-340b-reward [4K]"},{"id":"nvidia/nemotron-mini-4b-instruct","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/nemotron-mini-4b-instruct [4K]"},{"id":"nvidia/neva-22b","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/neva-22b [4K]"},{"id":"nvidia/riva-translate-4b-instruct","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/riva-translate-4b-instruct [4K]"},{"id":"nvidia/riva-translate-4b-instruct-v1.1","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/riva-translate-4b-instruct-v1.1 [4K]"},{"id":"nvidia/riva-translate-4b-instruct-v2","provider":"nvidia","context":"4K","context_length":4000,"free":false,"displayName":"nvidia/riva-translate-4b-instruct-v2 [4K]"}];

const FALLBACK_MODEL = "minimax/minimax-m3:free";
// Internal shared key — Vercel /api/chat forwards here after ITS OWN auth+deduct.
const INTERNAL_KEY = "hostamar-edge-internal-2026-xK39m";
const JWT_SECRET = "hostamar-docker-jwt-local-2026";

// ── No-card catalog tiers: KV -> GitHub raw -> embedded CATALOG ──
// R2 replaced (err 10042 needs card). KV is free without card; GitHub raw is the
// versioned source of truth; embedded CATALOG is the last-resort snapshot.
const GITHUB_RAW = "https://raw.githubusercontent.com/romelraisul/hostamar.com/main/MODEL_CATALOG.json";

function modelsFromCatalogDoc(doc) {
  if (!doc) return null;
  // gen-model-catalog.mjs writes { generatedAt, count, models: [...] };
  // older snapshots may be a bare array.
  const list = Array.isArray(doc) ? doc : doc.models;
  return Array.isArray(list) && list.length ? list : null;
}

async function getCatalog(env) {
  // Tier 1: KV (free, no card, <1ms edge read)
  try {
    const fromKv = await env.HOSTAMAR_CATALOG.get("MODEL_CATALOG", "json");
    const kvModels = modelsFromCatalogDoc(fromKv);
    if (kvModels) return { models: kvModels, source: "kv" };
  } catch (_) { /* fall through */ }

  // Tier 2: GitHub raw (source of truth, updated by model-heal.yml)
  try {
    const res = await fetch(GITHUB_RAW, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (res.ok) {
      const doc = await res.json();
      const ghModels = modelsFromCatalogDoc(doc);
      if (ghModels) {
        // write-back cache for the next request (1h TTL)
        env.HOSTAMAR_CATALOG.put("MODEL_CATALOG", JSON.stringify(doc), { expirationTtl: 3600 }).catch(() => {});
        return { models: ghModels, source: "github" };
      }
    }
  } catch (_) { /* fall through */ }

  // Tier 3: embedded snapshot baked at deploy time
  const emb = modelsFromCatalogDoc(CATALOG);
  return { models: emb || [], source: "embedded" };
}

async function logUsage(env, entry) {
  // Usage log into KV HOSTAMAR_LOGS: logs/usage/<date>/<n> (call via ctx.waitUntil)
  const day = new Date().toISOString().slice(0, 10);
  const key = `logs/usage/${day}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await env.HOSTAMAR_LOGS.put(key, JSON.stringify(entry));
}

function b64url(s) { return atob(s.replace(/-/g, "+").replace(/_/g, "/")); }

async function verifyJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(b64url(parts[0]));
    const payload = JSON.parse(b64url(parts[1]));
    if (header.alg === "HS256") {
      // Verify signature via WebCrypto
      const enc = new TextEncoder();
      const keyData = enc.encode(JWT_SECRET);
      const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      const sigBytes = b64url(parts[2]);
      const sigArray = Uint8Array.from(sigBytes, c => c.charCodeAt(0));
      const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        sigArray,
        enc.encode(parts[0] + "." + parts[1])
      );
      if (!valid) return null;
    }
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/v1/models") {
      const { models, source } = await getCatalog(env);
      return new Response(JSON.stringify({
        object: "list",
        source,
        data: models.map(m => ({
          id: m.id,
          object: "model",
          created: 1677610602,
          owned_by: m.provider,
          display_name: m.displayName,
          context_length: m.context_length,
          context: m.context,
          free: m.free,
        })),
      }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      });
    }

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      const auth = request.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      // Two auth paths:
      //  1. Internal: Vercel /api/chat proxies with x-internal-key (already authed)
      //  2. Direct: Hostamar JWT (kept for API customers)
      const internal = request.headers.get("x-internal-key") === INTERNAL_KEY;
      let user = null;
      if (!internal) {
        user = await verifyJwt(token);
        if (!user) {
          return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
        }
      }

      let body;
      try { body = await request.json(); } catch {
        return Response.json({ error: { message: "Invalid JSON" } }, { status: 400 });
      }
      let model = String(body.model || "").replace(/\s*\[[^\]]*\]\s*$/, "").trim() || FALLBACK_MODEL;
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (!messages.length) {
        return Response.json({ error: { message: "messages[] required" } }, { status: 400 });
      }

      // Zero-cost: only :free models allowed through the edge gateway
      const isFreeModel = model.endsWith(":free") || model.includes("longcat") || model.includes("ox-alpha") || model.includes("-free");
      if (!isFreeModel) {
        return Response.json({ error: { message: `PAID_BLOCKED: ${model} not on free tier`, code: 402 } }, { status: 402 });
      }

      const kiloKey = env.KILO_API_KEY;
      if (!kiloKey) return Response.json({ error: { message: "KILO_API_KEY missing" } }, { status: 500 });

      const callKilo = async (m) => {
        const r = await fetch(`${env.KILO_API_BASE}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${kiloKey}` },
          body: JSON.stringify({ model: m, messages, stream: false, max_tokens: body.max_tokens || 256 }),
          signal: AbortSignal.timeout(8000),
        });
        return r;
      };

      let upRes = await callKilo(model).catch(e => ({ ok: false, status: 0, text: () => Promise.resolve(e.message) }));
      let usedFallback = false;
      if (!upRes.ok && model !== FALLBACK_MODEL) {
        upRes = await callKilo(FALLBACK_MODEL).catch(e => ({ ok: false, status: 0, text: () => Promise.resolve(e.message) }));
        usedFallback = true;
        model = FALLBACK_MODEL;
      }
      if (!upRes.ok) {
        const t = await upRes.text().catch(() => "");
        return Response.json({ error: { message: `upstream ${upRes.status}`, body: String(t).slice(0, 200) } }, { status: 502 });
      }
      const data = await upRes.json();
      const reply = data?.choices?.[0]?.message?.content || "";
      const p = Number(data?.usage?.prompt_tokens || 0);
      const c = Number(data?.usage?.completion_tokens || 0);
      const costTaka = Math.round((((p + c) / 1000) * 0.5) * 100) / 100;

      // usage log -> KV HOSTAMAR_LOGS via waitUntil (survives response return)
      ctx.waitUntil(logUsage(env, {
        ts: new Date().toISOString(),
        model,
        usedFallback,
        prompt: p,
        completion: c,
        costTaka,
        internal,
        user: user ? (user.sub || user.email || "jwt") : null,
      }).catch(() => {}));

      return Response.json({
        id: data.id,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        provider: "kilo-edge",
        fallbackFrom: usedFallback ? data.__from : undefined,
        choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }],
        usage: { prompt_tokens: p, completion_tokens: c, total_tokens: p + c },
        costTaka,
        note: "edge gateway - credits deducted by caller app",
      });
    }

    if (url.pathname === "/health") {
      const { models, source } = await getCatalog(env);
      return Response.json({ ok: true, models: models.length, catalogSource: source });
    }

    // KV Binance rate for Worker costTaka -> usdtBdt conversion (cron writes here)
    if (url.pathname === "/kv/binance-rate") {
      if (request.method === "POST") {
        const internal = request.headers.get("x-internal-key") === INTERNAL_KEY;
        if (!internal) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const body = await request.json().catch(() => null);
        const rate = Number(body?.usdtBdt);
        if (!Number.isFinite(rate) || rate < 50) return Response.json({ error: "bad rate" }, { status: 400 });
        await env.HOSTAMAR_CATALOG.put("binance_rate", JSON.stringify({ usdtBdt: rate, source: body.source || "binance_p2p", updatedAt: new Date().toISOString() }));
        return Response.json({ ok: true, usdtBdt: rate });
      }
      if (request.method === "GET") {
        const raw = await env.HOSTAMAR_CATALOG.get("binance_rate", "json").catch(() => null);
        if (raw) return Response.json(raw);
        return Response.json({ usdtBdt: 126.24, source: "fallback", updatedAt: new Date().toISOString() });
      }
    }

    // logs proxy for analytics (KV HOSTAMAR_LOGS list)
    if (url.pathname === "/logs" && request.method === "GET") {
      const internal = request.headers.get("x-internal-key") === INTERNAL_KEY;
      if (!internal) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const list = await env.HOSTAMAR_LOGS.list({ prefix: "logs/usage/" }).catch(() => ({ keys: [] }));
      const logs = [];
      for (const k of (list.keys || []).slice(0, 50)) {
        const v = await env.HOSTAMAR_LOGS.get(k.name, "json").catch(() => null);
        if (v) logs.push(v);
      }
      return Response.json({ logs, count: logs.length });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
