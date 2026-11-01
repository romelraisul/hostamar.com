// NOTE: @sentry/nextjs v10's withSentryConfig previously injected `Html` into
// Next's built-in /404 /500 error pages during static prerender, which crashed
// the build. We keep the Sentry build-time wrapper DISABLED for now (the
// production build is currently blocked by a separate Next 14.2.35 + Vercel
// builder prerender bug on internal error pages). Sentry runtime reporting can
// be re-enabled here once the build is green.
const nextConfig = {
  skipHtmlTrailingSlashRedirect: true, // GSC verification needs 200 at /<file>.html, not 307 to clean URL
  // FORGE 2026-09-29: unconditional 'standalone' = the EXACT recipe of the only Ready prod build (mxq46aqfd 09-28 01:49: single function, 381 routes, serves hostamar.com). Serverless (output: undefined) fails to serve public/tv/*.mp4 at the edge — standalone bundles them into the single function deployment.
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // V17: /dashboard/chatos → the real Chat OS page (admin chat-os)
  async redirects() {
    return [
      { source: '/dashboard/chatos', destination: '/dashboard/admin/chat-os', permanent: true },
    ]
  },
  // reactStrictMode disabled: Next 14.2.5's build-time prerender of the
  // internal /_error page (which imports `Html` from next/document) crashes
  // on Vercel with "<Html> should not be imported outside of pages/_document".
  // strict mode forces that prerender; turning it off avoids the crash.
  // (Re-enable + bump Next to a patched 14.2.x once the build is green.)
  reactStrictMode: false,
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // V24: 24h image cache TTL
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' blob: data: https:; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; connect-src 'self' https://api.hostamar.com https://tv.hostamar.com https://vp9.hostamar.com; frame-ancestors 'none'" },
        ],
      },
      // PSI 2026-10-18: HTML was served private,no-cache (root layout read
      // cookies + force-dynamic). Layout is now static-friendly. s-maxage MUST
      // stay >= the pages' revalidate (86400) or it clamps edge caching to 1h
      // and every entry decays to stale-serve s-maxage=1 between deploys.
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/pricing',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/opengraph-image.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/twitter-image.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/v1/models',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/services/catalog',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/ai-services/catalog',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/tv/stable-channels',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=30' },
        ],
      },
      // FORGE 2026-11-01: explicit edge cache for catalog — route already returns
      // Cache-Control: s-maxage=300 + CDN-Cache-Control, but Next.js RSC vary headers
      // (RSC, Next-Router-State-Tree, Next-Router-Prefetch) suppressed edge HITs.
      // This rule overrides Vary at the edge so CF actually caches the JSON.
      // FORGE 2026-11-01 (2nd): route.ts deletes 'vary' but Next.js re-adds RSC vary
      // during serialization; explicitly set Vary: Accept, Accept-Encoding here to
      // override the RSC vary headers so Cloudflare caches a single copy per
      // Accept/Encoding combo (standard for JSON APIs).
      {
        source: '/api/store/products',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600' },
          { key: 'CDN-Cache-Control', value: 'max-age=300, stale-while-revalidate=600, stale-if-error=3600' },
          { key: 'Vary', value: 'Accept, Accept-Encoding' },
        ],
      },
      // PC-off-safe video shelf: immutable long-term cache for edge MP4s
      {
        source: '/tv/(.*)\\.mp4',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: true, // explicit (Next 14 default) — SWC minify
  compiler: {
    // V24: strip console.log/info in prod (keep error/warn) — smaller client bundles
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizeCss: false,
    serverActions: { allowedOrigins: ['hostamar.com', '*.vercel.app'] },
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['playwright-core'],
    // Trace the forked CodeAct worker into the standalone bundle (alongside the
    // Dockerfile safety COPY) so fork() finds it in both dev and prod.
    outputFileTracingIncludes: {
      '/api/harness/run': ['./lib/tools/codeact-worker.js'],
      '/api/telegram/webhook': ['./lib/tools/codeact-worker.js'],
    },
    // Exclude the 362MB docker/tv-station/videos from serverless function traces
    // (api/tv/viral/create* routes were pulling it in, blowing past 250MB limit).
    outputFileTracingExcludes: {
      '*': ['docker/tv-station/videos/**', 'public/tv/**'],
    },
  },
  // Vercel frontend calls the API through the Cloudflare Worker router
  // (api.hostamar.com), which routes to the computer tunnel (primary) and
  // fails over to Railway (cold backup) — keeping Railway at $0 when up.
  // IMPORTANT: the backend build (hostamar-app / Docker) sets NEXT_PUBLIC_BUILD_TARGET=api
  // and MUST serve /api/* LOCALLY. Proxying its own /api to api.hostamar.com creates a
  // circular loop (backend → Worker → tunnel → backend → rewrite again) that 404s on
  // dynamic [id] routes (e.g. /api/admin/approvals/:id/approve → Telegram ✅ 404 bug).
  // So the rewrite is applied ONLY on the frontend (Vercel) build, not the API build.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_BUILD_TARGET === 'api') return []
    return [
      {
        // Hostamar AI Gateway — our own OpenAI-compatible models under hostamar.com/v1
        // (proxies to the local gateway exposed via ai.hostamar.com tunnel)
        source: '/v1/:path*',
        destination: 'https://ai.hostamar.com/v1/:path*',
      },
      {
        source: '/api/:path*',
        has: [
          { type: 'header', key: 'x-skip-rewrite' }
        ],
        destination: '/api/:path*'
      },
      {
        source: '/api/video/:path*',
        destination: '/api/video/:path*'
      },
      {
        source: '/api/ai/:path*',
        destination: '/api/ai/:path*'
      },
      {
        source: '/api/storage/:path*',
        destination: '/api/storage/:path*'
      },
      {
        source: '/api/metrics',
        destination: '/api/metrics'
      },
      {
        source: '/api/health',
        destination: '/api/health'
      },
      {
        source: '/api/payment/:path*',
        destination: '/api/payment/:path*'
      },
      {
        source: '/api/payments/:path*',
        destination: '/api/payments/:path*'
      },
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*'
      },
      {
        source: '/api/admin/:path*',
        destination: '/api/admin/:path*'
      },
      {
        source: '/api/dashboard/:path*',
        destination: '/api/dashboard/:path*'
      },
      // NOTE: the old catch-all `/api/:path* -> https://api.hostamar.com/api/:path*`
      // was REMOVED. api.hostamar.com (computer tunnel) is down and every /api/*
      // prefix the frontend calls has a local route in this repo. Proxying unknown
      // paths to a dead backend produced 502s (e.g. /api/payments/bkash/create).
      // Unmatched /api paths now return a clean 404 instead.
    ]
  },
  webpack: (config) => {
    // Jackson (SAML) pulls typeorm, which tries to resolve optional DB drivers
    // we don't use (sqlite/react-native). Stub them so the production bundle
    // stays clean and avoids native-module resolution errors. We only use
    // engine:'sql' + postgres, so these stubs are never executed.
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native-sqlite-storage': false,
      'better-sqlite3': false,
      '@sap/hana-client': false,
      mysql: false,
      mysql2: false,
      mongodb: false,
      'pg-native': false,
      // playwright-core is used only in the Steel (cloud CDP) browser branch.
      // It must NOT be webpack-bundled — it has optional native deps
      // (chromium-bidi, electron, bufferutil, utf-8-validate, fsevents) that
      // fail to resolve at build time. Externalizing keeps it as a runtime
      // require() so connectOverCDP works on the server without a browser binary.
      'playwright-core': 'playwright-core',
      // Node.js built-ins for Edge runtime compatibility (bullmq needs these)
      'child_process': false,
      'fs/promises': false,
      'path': false,
      'os': false,
      'crypto': false,
      'stream': false,
      'net': false,
      'worker_threads': false,
      '@valkey/valkey-glide': false,
      'node:sqlite': false,
    }
    // typeorm + protobufjs use dynamic require() for optional drivers; webpack
    // can't statically analyze those, producing "Critical dependency" warnings.
    // They're benign — we only use engine:'sql' + postgres. Silence them.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
    ]
    return config
  },
}

module.exports = nextConfig
