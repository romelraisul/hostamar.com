import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig({
  incrementalCache: () =>
    import('./opennext-b2-cache').then((m) => m.default),
});

// @libsql/isomorphic-ws exports a `workerd` -> ./web.mjs target that Next's nft
// trace (node conditions) never copies, so esbuild fails to resolve it.
// Node conditions resolve ./node.mjs -> ws (traced + copied, bundled fine on
// workerd via nodejs_compat).
config.cloudflare!.useWorkerdCondition = false;

export default config;
