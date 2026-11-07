import type { OpenNextConfig } from '@opennextjs/cloudflare/node_modules/@opennextjs/aws/types/open-next.js'
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const cloudflareConfig = defineCloudflareConfig({})

const config: OpenNextConfig = {
  ...cloudflareConfig,
  edgeExternals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
}

export default config