import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig();

export default {
  ...cloudflareConfig,
  edgeExternals: [...(cloudflareConfig.edgeExternals || []), "@libsql/isomorphic-ws"],
  default: {
    ...cloudflareConfig.default,
    install: {
      packages: ["@libsql/isomorphic-ws@^0.1.5"],
    },
  },
};