/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Enable Vercel Edge CDN image optimization (requires `sharp` which is bundled with Next.js)
    // Disabling unoptimized: true allows Next.js Image Optimization API to work on Vercel Edge
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
    optimizeCss: false, // disabled by default — enable if using styled-components/tailwind with critters
    scrollRestoration: true,
  },
}

module.exports = nextConfig
