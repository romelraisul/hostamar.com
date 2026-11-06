import { readFileSync } from 'fs'

const script = readFileSync('dist/index.cjs', 'utf-8')

const metadata = {
  main_module: "index.cjs",
  bindings: [
    { name: "B2_ENDPOINT", type: "plain_text", text: "https://s3.us-east-005.backblazeb2.com" },
    { name: "B2_BUCKET_NAME", type: "plain_text", text: "hostamar-prod" },
    { name: "B2_PUBLIC_URL", type: "plain_text", text: "https://f005.hostamar.com/file/hostamar-prod" },
    { name: "B2_REGION", type: "plain_text", text: "us-east-005" },
    { name: "B2_APPLICATION_KEY_ID", type: "plain_text", text: "a26c99e41020" },
    { name: "B2_APPLICATION_KEY", type: "plain_text", text: "0051dc617d90920d0b29572b514935afa81db28dc7" },
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
  `Content-Disposition: form-data; name="script"; filename="index.cjs"\r\n` +
  `Content-Type: application/javascript\r\n\r\n` +
  script + `\r\n` +
  `--${boundary}--\r\n`

const response = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/e00717304c1139751214b8cda5078a8d/workers/scripts/hostamar-f005-cdn',
  {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  }
)

const result = await response.json()
console.log(JSON.stringify(result, null, 2))
