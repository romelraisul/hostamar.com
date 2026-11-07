// @ts-ignore
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  // @ts-ignore
  externals: ['@libsql/isomorphic-ws', '@libsql/client', '@libsql/hrana-client'],
  cloudflare: {
    dangerousDisableConfigValidation: true,
  },
})