// ponytail: B2 (S3-compatible) incremental cache for OpenNext on Workers.
// Replaces the KV cache — KV free tier is 1000 writes/day and one populateCache
// burns 414, so the 2nd deploy of a day dies with error 10048 and every
// rebuild loses its cache (ISR keys are build-specific). B2 free tier:
// 2500 writes + 2500 reads/day, 10GB — no quota kill.
// MUST stay SDK-free: importing @aws-sdk/client-s3 puts it in the worker's
// eager module graph and every cold isolate dies with "Exceeded CPU time
// limit" parsing it (saw it live: even /api/health 503'd). S3 access goes
// through opennext-b2-s3.js (SigV4 over native fetch, zero imports).
// Failure mode: get() returns null and set() swallows on any B2 error, so a
// bad key/bucket degrades to plain SSR — cache failure never takes the site
// down. ponytail: if B2 ever throttles (Class A/B caps), add the Cloudflare
// Cache API in front before touching anything else.
import { createHash } from "node:crypto";
// ponytail: NO `@opennextjs/cloudflare` import here, not even for
// getCloudflareContext — importing the package root drags its barrel into the
// request path and evaluating it inside a heavy render (home ISR lookup) blows
// the Workers CPU limit (measured: home 503 "Exceeded CPU Limit" with the root
// import, 200 with the built-in kv override). vars + secrets are on
// process.env inside the OpenNext worker, so plain env reads are enough.
// NO `node:crypto` either: the Node crypto shim's first eval lands inside the
// first request on a cold isolate (the override factory's dynamic import
// resolves lazily) and CPU-dies heavy routes (home, /api/store/products both
// 1102'd with this import present; WebCrypto is a workerd native — zero eval
// cost). Hashing goes through sha256hex in opennext-b2-s3.js.
import { b2S3Fetch, sha256hex } from "./opennext-b2-s3.js";

export const NAME = "cf-b2-incremental-cache";

// Lazy: module scope runs outside the request context — env is not ready yet.
function cfg() {
  return {
    endpoint: process.env.B2_S3_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
    region: process.env.B2_S3_REGION || "us-east-005",
    keyId: process.env.B2_ACCOUNT_ID || "",
    appKey: process.env.B2_APPLICATION_KEY || "",
    bucket: process.env.B2_CACHE_BUCKET || "",
  };
}

// Same layout as @opennextjs/cloudflare's internal computeCacheKey:
// <prefix>/<buildId>/<sha256(key)>.<cacheType>
async function cacheKey(key: string, cacheType = "cache"): Promise<string> {
  const prefix = process.env.B2_CACHE_PREFIX || "incremental-cache";
  const buildId = process.env.OPEN_NEXT_BUILD_ID || "unknown";
  const hash = await sha256hex(key);
  return `${prefix}/${buildId}/${hash}.${cacheType}`;
}

class B2IncrementalCache {
  readonly name = NAME;

  async get(key: string, cacheType?: string) {
    // ponytail: fetch-cache (cacheType "fetch") stays a no-op — /api/store/products'
    // upstream fetches run miss->render->set right at the Workers CPU ceiling and
    // 1102-die (3/3 with live fetch cache, 200 on the no-op control). Pages (ISR)
    // keep full B2 — those entries are pre-populated from .open-next/cache.
    if (cacheType === "fetch") return null;
    try {
      const res = await b2S3Fetch(cfg(), "GET", await cacheKey(key, cacheType));
      if (!res.ok) {
        if (res.status !== 404) console.error("[b2-inc-cache] get error:", res.status);
        return null; // 404 = cold entry, a normal miss
      }
      const lastModified = res.headers.get("last-modified");
      return {
        value: JSON.parse(await res.text()),
        lastModified: lastModified ? new Date(lastModified).getTime() : Date.now(),
      };
    } catch (e) {
      console.error("[b2-inc-cache] get threw:", e instanceof Error ? e.name : e);
      return null;
    }
  }

  async set(key: string, value: unknown, cacheType?: string): Promise<void> {
    if (cacheType === "fetch") return; // see get(): fetch-cache set work 1102-dies products
    try {
      const res = await b2S3Fetch(cfg(), "PUT", await cacheKey(key, cacheType), JSON.stringify(value));
      if (!res.ok) console.error("[b2-inc-cache] set failed:", res.status);
    } catch (e) {
      console.error("[b2-inc-cache] set threw:", e instanceof Error ? e.name : e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const res = await b2S3Fetch(cfg(), "DELETE", await cacheKey(key));
      if (!res.ok && res.status !== 404) console.error("[b2-inc-cache] delete failed:", res.status);
    } catch (e) {
      console.error("[b2-inc-cache] delete threw:", e instanceof Error ? e.name : e);
    }
  }
}

export default new B2IncrementalCache();
