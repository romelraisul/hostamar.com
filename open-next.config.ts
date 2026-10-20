import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({
  incrementalCache: () =>
    import('./opennext-b2-cache').then((m) => m.default),
  // Mark @libsql/isomorphic-ws as external to avoid build error
  // (worker doesn't actually need it at runtime — libsql client uses native ws)
  experimental: {
    externalPackages: ['@libsql/isomorphic-ws'],
  },
});
