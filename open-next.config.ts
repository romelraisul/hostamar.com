import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// ponytail: KV-backed ISR cache — cold isolates serve prerendered HTML from KV
// instead of full SSR (kills 700-1250ms cold TTFB). Upgrade to R2 if KV size grows.
export default defineCloudflareConfig({
  incrementalCache: () =>
    import('@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache').then(
      (m) => m.default
    ),
});
