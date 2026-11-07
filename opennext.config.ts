// @ts-ignore
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const cloudflareConfig = defineCloudflareConfig({})

// @ts-ignore
const config = {
  ...cloudflareConfig,
  edgeExternals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
  cloudflare: {
    ...cloudflareConfig.cloudflare,
    dangerousDisableConfigValidation: true,
  },
}

export default config