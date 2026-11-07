import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  externals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
})