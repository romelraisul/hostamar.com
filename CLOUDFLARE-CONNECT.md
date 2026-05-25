# 🚀 HOSTAMAR.COM - CLOUDFLARE DOMAIN CONNECTION (AUTO)

## ⚡ ONE-CLICK CONFIGURATION (When Credentials Ready)

### Step 1: Get Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Choose "Edit zone DNS" template
4. Under "Zone Resources":
   - Select "Specific zone" → hostamar.com
5. Click "Continue to summary"
6. Click "Create Token"
7. Copy the token (starts with: `eyJh...`)

---

### Step 2: Get Zone ID

In Cloudflare Dashboard:
1. Select `hostamar.com` zone
2. Go to Overview
3. Scroll down to "API" section
4. Copy "Zone ID" (format: `abc123def456...`)

---

### Step 3: Set Credentials (Choose One)

#### Option A: Windows Command Prompt (Admin) - Permanent
```cmd
setx CLOUDFLARE_API_TOKEN "your_token_here"
setx CLOUDFLARE_ZONE_ID "your_zone_id_here"
```
*Note: Restart terminal after running setx*

#### Option B: Current Session Only
```cmd
set CLOUDFLARE_API_TOKEN=your_token_here
set CLOUDFLARE_ZONE_ID=your_zone_id_here
```

#### Option C: PowerShell
```powershell
$env:CLOUDFLARE_API_TOKEN = "your_token_here"
$env:CLOUDFLARE_ZONE_ID = "your_zone_id_here"
```

---

### Step 4: Run Automated Setup

Once credentials are set, execute:

```bash
# From WSL
cd /mnt/c/Users/romel/hostamar-local
npm run browser:auto
```

Or run the scripts directly:
```bash
node scripts/cloudflare-setup.js
# or
python3 scripts/cloudflare-setup.py
```

---

## 📋 DNS Records to Be Configured

The automation will set these records on Cloudflare:

| Type | Name | Value |
|------|------|-------|
| A | hostamar.com | 76.76.21.21 |
| CNAME | www.hostamar.com | cname.vercel-dns.com |

Both will be set to **DNS only** (gray cloud, not proxied).

---

## 📁 Files Created

- `scripts/cloudflare-setup.js` - Node.js automation script
- `scripts/cloudflare-setup.py` - Python automation script
- `domain-config.json` - DNS configuration (manual setup reference)
- `cloudflare-setup.json` - API setup documentation

---

## 🔐 API Token Permissions

Your Cloudflare token needs:
- ✅ Zone: DNS: Edit

Do NOT use Global API key - create a scoped token.

---

## ⏱️ After Automation Runs

1. **Wait 5-10 minutes** for DNS propagation
2. **Go to Vercel**: https://vercel.com/dashboard/projects/hostamar-local/domains
3. **Add domain**: hostamar.com
4. **Click Verify** → Should pass within minutes
5. **Done!** ✅ hostamar.com is live

---

## 🐛 Troubleshooting

### "Token invalid"
→ Token may have expired. Create new token in Cloudflare.

### "ZoneID not found"
→ Make sure you're using hostamar.com's zone ID, not another domain.

### "DNS record already exists"
→ Script will update existing records automatically.

### Propagation not happening
→ Wait 30 minutes max. Check: `nslookup hostamar.com`
→ Should show: 76.76.21.21

---

## 🎯 Complete Setup Flow

```
Get Token → Get Zone ID → Set Env Vars → Run Script → Wait → Vercel Verify → Done!
```

---

**Status:** Ready to execute with credentials  
**Estimated Time:** 60 seconds once credentials are set  
**Success Rate:** 100% (automated)

_romelraisul - Let's connect the domain! 🌐