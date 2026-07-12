const path = require('path')

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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
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
        source: '/api/:path*',
        destination: 'https://api.hostamar.com/api/:path*',
      },
    ]
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, '.')
    return config
  },
}

module.exports = nextConfig
