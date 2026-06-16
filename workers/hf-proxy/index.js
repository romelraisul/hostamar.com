/**
 * Cloudflare Worker: HuggingFace Inference API Proxy
 * Bypasses Bangladesh ISP DNS block on api-inference.huggingface.co
 */
const HF_API_BASE = 'https://api-inference.huggingface.co'
const HF_TOKEN = 'hf_mieQbcNNPAvnKStppSCyWboZVRgJAOeSd'

const SKIP_REQ_HEADERS = new Set([
  'host', 'connection', 'content-length',
  'transfer-encoding', 'te', 'trailer', 'upgrade',
])
const SKIP_RESP_HEADERS = new Set([
  'transfer-encoding', 'connection', 'content-encoding',
  'content-length', 'x-amz-cf-id', 'x-amz-cf-pop', 'cf-ray',
  'server', 'date', 'vary', 'x-request-id',
])

function clean(req, skipSet) {
  const h = {}
  for (const [k, v] of Object.entries(req)) {
    if (!skipSet.has(k.toLowerCase())) h[k] = v
  }
  return h
}

async function handle(request) {
  const url = new URL(request.url)
  // Proxy: https://hf.hostamar.com/models/xxx -> https://api-inference.huggingface.co/models/xxx
  const target = `${HF_API_BASE}${url.pathname}${url.search}`

  const reqHeaders = clean(Object.fromEntries(request.headers), SKIP_REQ_HEADERS)
  if (!reqHeaders['Authorization']) reqHeaders['Authorization'] = `Bearer ${HF_TOKEN}`

  let resp
  try {
    resp = await fetch(target, {
      method: request.method,
      headers: reqHeaders,
      body: ['POST','PUT','PATCH'].includes(request.method) ? request.body : undefined,
      duplex: 'half',
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const respHeaders = clean(Object.fromEntries(resp.headers), SKIP_RESP_HEADERS)
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders,
  })
}

addEventListener('fetch', e => { e.respondWith(handle(e.request)) })
