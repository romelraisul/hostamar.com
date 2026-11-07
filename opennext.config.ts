// @ts-ignore
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const cloudflareConfig = defineCloudflareConfig({})

// @ts-ignore
const config = {
  ...cloudflareConfig,
  edgeExternals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
}

export default config