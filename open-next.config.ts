import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// ponytail: B2 (S3-compatible) ISR cache — cold isolates serve prerendered HTML
// from Backblaze B2 instead of full SSR (kills 700-1250ms cold TTFB) with no
// write quota (KV free tier died at 1000 writes/day, error 10048). Adapter in
// opennext-b2-cache.ts; degrades to SSR if B2 is unreachable.
export default defineCloudflareConfig({
  incrementalCache: () =>
    import('./opennext-b2-cache').then(
      (m) => m.default
    ),
});
