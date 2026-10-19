#!/usr/bin/env node
// ponytail: uploads .open-next/cache/** to Backblaze B2 under the exact OpenNext
// computeCacheKey layout. ISR keys are BUILD_ID-specific — run after every
// `opennextjs-cloudflare build` (npm run worker:deploy) or home/pricing fall
// back to full SSR. Reads B2 creds from env or .env.local; never prints them.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function loadEnv() {
  if (process.env.B2_ACCOUNT_ID && process.env.B2_CACHE_BUCKET) return;
  try {
    const env = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const m of env.matchAll(/^(B2_[A-Z_0-9]+)=(.*)$/gm)) {
      process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const { b2S3Fetch } = await import(path.join(ROOT, "opennext-b2-s3.js"));
await loadEnv();

// .env.local uses B2_ENDPOINT/B2_REGION/B2_BUCKET; the worker's vars are the
// B2_S3_* names in wrangler-pages.toml — accept either.
const cfg = {
  endpoint: process.env.B2_S3_ENDPOINT || process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
  region: process.env.B2_S3_REGION || process.env.B2_REGION || "us-east-005",
  keyId: process.env.B2_ACCOUNT_ID || "",
  appKey: process.env.B2_APPLICATION_KEY || "",
  bucket: process.env.B2_CACHE_BUCKET || process.env.B2_BUCKET || "",
};
if (!cfg.keyId || !cfg.appKey || !cfg.bucket) {
  console.error("populate-b2: missing B2_ACCOUNT_ID / B2_APPLICATION_KEY / B2_CACHE_BUCKET");
  process.exit(1);
}

const CACHE_DIR = path.join(ROOT, ".open-next", "cache");
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const enc = new TextEncoder();
const sha256hex = async (d) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(d)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Same derivation as @opennextjs/cloudflare populate-cache getCacheAssets:
// pages  <buildId>/<key>.cache    -> key /<key>,      cacheType cache
// fetch  __fetch/<buildId>/<name> -> key /<name>,     cacheType fetch
const files = await walk(CACHE_DIR);
const jobs = [];
for (const f of files) {
  const rel = path.relative(CACHE_DIR, f).split(path.sep).join("/");
  if (rel.startsWith("__fetch")) {
    const [, buildId, ...keyParts] = rel.split("/");
    if (!buildId || keyParts.length === 0) continue;
    jobs.push({
      key: `incremental-cache/${buildId}/${await sha256hex("/" + keyParts.join("/"))}.fetch`,
      body: await readFile(f, "utf8"),
      rel,
    });
  } else if (rel.endsWith(".cache")) {
    const [buildId, ...keyParts] = rel.slice(0, -".cache".length).split("/");
    if (!buildId || keyParts.length === 0) continue;
    jobs.push({
      key: `incremental-cache/${buildId}/${await sha256hex("/" + keyParts.join("/"))}.cache`,
      body: await readFile(f, "utf8"),
      rel,
    });
  }
}
if (jobs.length === 0) {
  console.error("populate-b2: no cache entries in .open-next/cache — run the build first");
  process.exit(1);
}

console.log(`populate-b2: uploading ${jobs.length} entries to ${cfg.bucket}`);
let ok = 0, fail = 0, idx = 0;
const failures = [];
async function worker() {
  while (idx < jobs.length) {
    const j = jobs[idx++];
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await b2S3Fetch(cfg, "PUT", j.key, j.body);
        if (res.ok) { ok++; done = true; }
        else if (res.status === 429 || res.status >= 500) await new Promise((r) => setTimeout(r, attempt * 1500));
        else { fail++; failures.push(`${res.status} ${j.rel}`); done = true; }
      } catch (e) {
        if (attempt === 3) { fail++; failures.push(`ERR ${j.rel} ${String(e).slice(0, 80)}`); done = true; }
        else await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

// spot-check: GET back the home page entry (+ first fetch entry if any)
const homeKey = jobs.find((j) => j.rel.endsWith("/index.cache"));
const fetchJob = jobs.find((j) => j.rel.startsWith("__fetch"));
let spot = "n/a";
if (homeKey) {
  const res = await b2S3Fetch(cfg, "GET", homeKey.key);
  spot = `home GET ${res.status}${res.ok ? " " + (await res.text()).length + "B" : ""}`;
}
if (fetchJob) {
  const res = await b2S3Fetch(cfg, "GET", fetchJob.key);
  spot += ` | fetch GET ${res.status}`;
}

console.log(JSON.stringify({ total: jobs.length, ok, fail, spot, failures: failures.slice(0, 8) }));
if (fail > 0 || ok !== jobs.length) process.exit(1);
