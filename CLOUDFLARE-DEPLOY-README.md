# Hostamar Cloudflare Pages Deployment

## Quick Deploy (Manual)

Since Wrangler CLI requires authentication, use the Cloudflare Dashboard:

### Step 1: Open Cloudflare Dashboard
1. Go to: https://dash.cloudflare.com
2. Login to your account

### Step 2: Navigate to Pages
1. Click "Pages" in the left sidebar
2. Select "hostamar-local" project

### Step 3: Upload Deployment
1. Click "Deployments" tab
2. Click "Upload deployment" button
3. Select: hostamar-deploy.zip
4. Click "Deploy"

### Step 4: Add Custom Domain
1. Go to "Settings" tab
2. Click "Custom Domains"
3. Add: hostamar.com
4. Add: www.hostamar.com
5. Save and wait for DNS propagation (5-10 min)

### Step 5: Verify Deployment
- Visit: https://hostamar.com
- Should see landing page
- SSL certificate auto-provisions

## Alternative: GitHub Auto-Deploy

1. Push code to GitHub repository
2. Connect repository in Cloudflare Pages
3. Set build command: `npm run build`
4. Set output directory: `.next-dist`
5. Auto-deploys on every push

## Files Included

- .next-dist/: Production build (270 files)
- hostamar-deploy.zip: Compressed deploy package
- CNAME: Domain configuration
- deploy.sh: Bash deployment script
- deploy-windows.bat: Windows deployment script

## URLs

- Current Vercel: https://hostamar-local-po02js9ux...vercel.app
- Current Cloudflare: https://hostamar-local.pages.dev  
- Custom Domain: https://hostamar.com (after setup)

## API Endpoints

- Health: /api/health
- Auth: /api/auth/*
- Admin: /api/admin/*
- Payments: /api/dashboard/payment/*

## Support

For issues, check Cloudflare Pages documentation:
https://developers.cloudflare.com/pages/
