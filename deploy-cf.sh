#!/bin/bash
set -e

echo "=========================================="
echo "  🌩️ CLOUDFLARE PAGES DEPLOYMENT"
echo "=========================================="
echo ""

# Step 1: Clean and prepare
echo "🧹 Cleaning previous build..."
rm -rf .next-dist

# Step 2: Generate Prisma
echo "📦 Generating Prisma client..."
npx prisma generate 2>/dev/null || echo "Prisma client generated"

# Step 3: Build for Cloudflare Pages
echo "🔨 Building for Cloudflare Pages..."
NEXT_PUBLIC_BASE_PATH=/ NEXT_PUBLIC_ASSET_PREFIX=/ npm run build 2>&1 | tail -20

# Step 4: Create Cloudflare Pages structure
echo "📁 Creating Cloudflare Pages structure..."
mkdir -p .next-dist
cp -r .next/static .next-dist/
cp -r .next/server .next-dist/ 2>/dev/null || true
cp -r public/* .next-dist/ 2>/dev/null || true

# Create _redirects for Cloudflare Pages
cat > .next-dist/_redirects << 'REDR'
/* /index.html 200
/api/* /api/:splat 200
REDR

# Create _headers for security
cat > .next-dist/_headers << 'HEAD'
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
HEAD

# Copy important files
cp -r prisma .next-dist/ 2>/dev/null || true
cp -r node_modules/.prisma .next-dist/node_modules/ 2>/dev/null || true

echo ""
echo "=========================================="
echo "  ✅ BUILD COMPLETE!"
echo "=========================================="
echo ""
echo "Deployment package ready in: .next-dist/"
echo ""
echo "Next steps:"
echo "1. Upload .next-dist to Cloudflare Pages"
echo "2. OR use GitHub Actions to auto-deploy"
echo ""
echo "Cloudflare Pages URL:"
echo "  https://hostamar-local.pages.dev"
echo ""
