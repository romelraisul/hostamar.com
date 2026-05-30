# HOSTAMAR DEPLOYMENT INSTRUCTIONS

## Quick Deploy (2 minutes)

### Step 1: Open Cloudflare Dashboard
Go to: https://dash.cloudflare.com

### Step 2: Navigate to Pages
1. Click "Pages" in left sidebar
2. Select "hostamar-local" project
3. Click "Settings" tab

### Step 3: Add Custom Domain
1. Scroll to "Custom Domains"
2. Click "Set up a custom domain"
3. Enter: hostamar.com
4. Click Continue
5. Select: "I'll configure DNS records"
6. Click Save
7. Repeat for: www.hostamar.com

### Step 4: Upload Deployment
1. Click "Deployments" tab
2. Click "Upload deployment" button
3. Select file: hostamar-deploy-final.zip
   (or hostamar-deploy.zip)
4. Click "Deploy"

### Step 5: Wait for SSL
- Wait 5-10 minutes
- SSL certificate auto-provisions
- Status shows "Active"

### Step 6: Verify
Visit: https://hostamar.com

## Alternative: Manual DNS Setup

If domain is registered elsewhere:

### At your registrar (GoDaddy, Namecheap, etc.):

Add these DNS records:

TYPE: A
NAME: @
VALUE: 104.18.1.139
PROXY: 🔵 (orange cloud)

TYPE: A
NAME: @
VALUE: 104.18.2.139
PROXY: 🔵 (orange cloud)

TYPE: CNAME
NAME: www
VALUE: hostamar-local.pages.dev
PROXY: 🔵 (orange cloud)

### Then in Cloudflare:
1. Go to Pages → Settings → Custom Domains
2. Add: hostamar.com
3. Add: www.hostamar.com
4. Deploy

## After Deployment

Your site will be live at:
https://hostamar.com

## Marketing URLs

For immediate sharing (before custom domain):
- https://hostamar-local.pages.dev
- https://hostamar-local-...vercel.app

## Files

- hostamar-deploy-final.zip - Main deployment package
- hostamar-deploy.zip - Backup
- CNAME - Domain configuration
- deploy.bat - Windows deploy script
- deploy.ps1 - PowerShell script
- deploy.sh - Bash script
- FACEBOOK_POST.txt - Facebook post copy
- WHATSAPP_MSG.txt - WhatsApp message copy

## Troubleshooting

**Error: Upload failed**
- Check file size (< 25MB)
- Ensure zip contains files
- Try re-zipping

**Error: DNS not configured**
- Wait 5-10 minutes
- Check DNS records
- Verify at Cloudflare DNS

**Error: SSL not working**
- Wait 10-15 minutes
- Check domain verification
- Ensure A records point to Cloudflare IPs

## Support

Cloudflare Pages Docs:
https://developers.cloudflare.com/pages/

Cloudflare DNS Docs:
https://developers.cloudflare.com/dns/

## Once Live

1. Share on Facebook groups
2. Share on WhatsApp
3. Get first customers
4. Start making money!

--- DEPLOY NOW! ---
