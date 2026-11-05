import { readFileSync } from 'fs'

const script = readFileSync('dist/index.mjs', 'utf-8')
const metadata = {
  main_module: "index.mjs",
  bindings: [
    { name: "B2_ENDPOINT", type: "plain_text", text: "https://s3.us-east-005.backblazeb2.com" },
    { name: "B2_BUCKET_NAME", type: "plain_text", text: "hostamar-prod" },
    { name: "B2_PUBLIC_URL", type: "plain_text", text: "https://f005.hostamar.com/file/hostamar-prod" },
    { name: "B2_REGION", type: "plain_text", text: "us-east-005" },
    { name: "B2_APPLICATION_KEY_ID", type: "plain_text", text: "B2_KEY_ID_PLACEHOLDER" },
    { name: "B2_APPLICATION_KEY", type: "plain_text", text: "B2_APP_KEY_PLACEHOLDER" },
    { name: "F005_CDN_URL", type: "plain_text", text: "https://hostamar.com" }
  ],
  compatibility_date: "2024-11-01",
  compatibility_flags: ["nodejs_compat"],
  usage_model: "standard"
}

const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2)
const body = 
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="metadata"\r\n` +
  `Content-Type: application/json\r\n\r\n` +
  JSON.stringify(metadata) + `\r\n` +
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="script"; filename="index.mjs"\r\n` +
  `Content-Type: application/javascript\r\n\r\n` +
  script + `\r\n` +
  `--${boundary}--\r\n`

const response = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/e00717304c1139751214b8cda5078a8d/workers/scripts/hostamar-f005-cdn',
  {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer PLACEHOLDER_CF_TOKEN',
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  }
)

const result = await response.json()
console.log(JSON.stringify(result, null, 2))
