import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig();

export default {
  ...cloudflareConfig,
  edgeExternals: [...(cloudflareConfig.edgeExternals || []), "@libsql/isomorphic-ws"],
};