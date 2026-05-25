// Build script for Cloudflare Pages static deployment
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Cloudflare Pages build...');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Build Next.js with static export
  console.log('🔨 Building Next.js application...');
  execSync('NEXT_PUBLIC_BASE_PATH=/ NEXT_PUBLIC_ASSET_PREFIX=/ npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: 'true' }
  });

  // Create _redirects file for Cloudflare Pages
  console.log('📝 Creating _redirects file...');
  const redirects = `
# Cloudflare Pages redirects
/dashboard/* /dashboard/:splat 200
/api/* /api/:splat 200
/* /index.html 200
`;
  fs.writeFileSync('.next/_redirects', redirects);

  // Create _headers for caching
  console.log('⚙️ Creating _headers file...');
  const headers = `
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable
`;
  fs.writeFileSync('.next/_headers', headers);

  console.log('✅ Build complete!');
  console.log('📁 Output directory: .next/');
  console.log('🌐 Ready for Cloudflare Pages deployment');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}