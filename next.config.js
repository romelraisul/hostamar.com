// NOTE: @sentry/nextjs v10's withSentryConfig previously injected `Html` into
// Next's built-in /404 /500 error pages during static prerender, which crashed
// the build. We keep the Sentry build-time wrapper DISABLED for now (the
// production build is currently blocked by a separate Next 14.2.35 + Vercel
// builder prerender bug on internal error pages). Sentry runtime reporting can
// be re-enabled here once the build is green.
const nextConfig = {
  // reactStrictMode disabled: Next 14.2.5's build-time prerender of the
  // internal /_error page (which imports `Html` from next/document) crashes
  // on Vercel with "<Html> should not be imported outside of pages/_document".
  // strict mode forces that prerender; turning it off avoids the crash.
  // (Re-enable + bump Next to a patched 14.2.x once the build is green.)
  reactStrictMode: false,
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/hls/tv/index.m3u8',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=10' }],
      },
      {
        source: '/api/tv/playlist',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' }],
      },
      {
        source: '/api/tv/iptv.m3u',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=600' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://comfy.hostamar.com https://api.hostamar.com; frame-ancestors 'none'" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/.env', destination: '/404', permanent: false },
      { source: '/.env:params*', destination: '/404', permanent: false },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
    serverComponentsExternalPackages: ['playwright-core'],
    // Trace the forked CodeAct worker into the standalone bundle (alongside the
    // Dockerfile safety COPY) so fork() finds it in both dev and prod.
    outputFileTracingIncludes: {
      '/api/harness/run': ['./lib/tools/codeact-worker.js'],
      '/api/telegram/webhook': ['./lib/tools/codeact-worker.js'],
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
      {
        source: '/api/:path*',
        destination: 'https://api.hostamar.com/api/:path*'
      },
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
