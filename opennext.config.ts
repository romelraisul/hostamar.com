import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  // @ts-ignore - edgeExternals is in OpenNextConfig but not CloudflareOverrides
  edgeExternals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
})