#!/usr/bin/env node
// CI gate for model-heal.yml: count objects in the B2 assets/cache bucket and
// fail if fewer than 462 are reachable. Read-only (GET list), unlike
// populate-b2.mjs which PUTs from a local .open-next/cache that CI never has.
// ponytail: empty key = S3 ListObjects v1, one page holds 1000 > 462 keys.
// If the bucket ever passes 1000 keys, add ListObjectsV2 pagination (needs
// query-string signing in opennext-b2-s3.js first).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function loadEnv() {
  if (process.env.B2_ACCOUNT_ID && (process.env.B2_CACHE_BUCKET || process.env.B2_BUCKET)) return;
  try {
    const env = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const m of env.matchAll(/^(B2_[A-Z_0-9]+)=(.*)$/gm)) {
      process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}
await loadEnv();

const cfg = {
  endpoint: process.env.B2_S3_ENDPOINT || process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  region: process.env.B2_S3_REGION || process.env.B2_REGION || "us-east-005",
  keyId: process.env.B2_ACCOUNT_ID || "",
  appKey: process.env.B2_APPLICATION_KEY || "",
  bucket: process.env.B2_CACHE_BUCKET || process.env.B2_BUCKET || "",
};

if (!cfg.keyId || !cfg.appKey || !cfg.bucket) {
  console.error("verify-b2: missing B2_ACCOUNT_ID / B2_APPLICATION_KEY / B2_BUCKET");
  process.exit(2);
}

const { b2S3Fetch } = await import(path.join(ROOT, "opennext-b2-s3.js"));
const res = await b2S3Fetch(cfg, "GET", "");
if (!res.ok) {
  console.error(`verify-b2: list failed HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const count = (xml.match(/<Key>/g) || []).length;
console.log(JSON.stringify({ bucket: cfg.bucket, keys: count, minimum: 462 }));
if (count < 462) {
  console.error(`verify-b2: FAIL — only ${count} objects reachable, need >= 462`);
  process.exit(1);
}
console.log("verify-b2: OK");
