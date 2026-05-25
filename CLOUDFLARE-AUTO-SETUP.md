# CLOUDFLARE AUTOMATED DOMAIN CONNECTION - COMPLETE GUIDE

## ⚡ EXECUTE NOW (3 Steps)

### Step 1: Get Credentials (2 minutes)

**Cloudflare API Token:**
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Select "Edit zone DNS" template
4. Permissions: Zone - DNS - Edit
5. Zone Resources: hostamar.com
6. Click "Create Token"
7. COPY THE TOKEN (starts with: `eyJ...`)

**Zone ID:**
1. Cloudflare Dashboard → hostamar.com
2. Overview page
3. Find "Zone ID" (right sidebar)
4. COPY THE ZONE ID (format: `abc123...`)

---

### Step 2: Set Credentials in Windows (Choose One)

#### Method A: Command Prompt (Admin - PERMANENT)
```cmd
cd C:\Users\romel
setx CLOUDFLARE_API_TOKEN "eyJ_your_token_here"
setx CLOUDFLARE_ZONE_ID "abc123_your_zone_id"
```
*Restart terminal after this*

#### Method B: Current Session (TEMPORARY)
```cmd
set CLOUDFLARE_API_TOKEN=eyJ_your_token_here
set CLOUDFLARE_ZONE_ID=abc123_your_zone_id
```

#### Method C: PowerShell
```powershell
$env:CLOUDFLARE_API_TOKEN = "eyJ_your_token_here"
$env:CLOUDFLARE_ZONE_ID = "abc123_your_zone_id"
```

---

### Step 3: Run Automation (1 minute)

#### From WSL Terminal:
```bash
cd /mnt/c/Users/romel/hostamar-local

# Run Node.js script (preferred)
node scripts/cloudflare-setup.js

# OR run Python script
python3 scripts/cloudflare-setup.py
```

#### From Windows Command Prompt:
```cmd
cd C:\Users\romel\hostamar-local
powershell -ExecutionPolicy Bypass -File .\scripts\cloudflare-connect.ps1
```

---

## 📋 What It Does

✅ Sets 2 DNS records automatically:
- `A @ → 76.76.21.21` (root domain)
- `CNAME www → cname.vercel-dns.com` (www subdomain)

✅ Verifies records exist
✅ Reports success/failure

---

## ⏱️ Timeline

| Step | Time | Done |
|------|------|------|
| Get Cloudflare token | 2 min | [ ] |
| Get Zone ID | 1 min | [ ] |
| Set environment variables | 1 min | [ ] |
| Run automated script | 30 sec | [ ] |
| DNS propagation | 5-10 min | ⏳ |
| Vercel domain verify | 2 min | [ ] |
| **Total** | **~15 min** | |

---

## 🎯 After DNS is Set

1. **Wait 5-10 minutes** (DNS propagation)
2. **Test** (optional):
   ```cmd
   nslookup hostamar.com
   # Should show: 76.76.21.21
   ```
3. **Go to Vercel**: https://vercel.com/dashboard/projects/hostamar-local/domains
4. **Add domain**: hostamar.com
5. **Click Verify** ✅
6. **Done!** Site is live at https://hostamar.com

---

## 📁 Scripts Created

| File | Purpose |
|------|---------|
| `scripts/cloudflare-setup.js` | Node.js automation (Linux/WSL) |
| `scripts/cloudflare-setup.py` | Python automation (cross-platform) |
| `scripts/cloudflare-connect.ps1` | PowerShell automation (Windows native) |
| `CLOUDFLARE-CONNECT.md` | This guide |
| `domain-config.json` | DNS config reference |

---

## 🔐 Security Notes

- Cloudflare tokens are **sensitive** - treat like passwords
- Use **scoped tokens** (not Global API key)
- Token permissions: Zone - DNS - Edit only
- Token can be revoked anytime in Cloudflare dashboard
- Scripts are **local only** - no data sent anywhere except Cloudflare API

---

## 🐛 Troubleshooting

### "Token invalid"
→ Token may be expired or wrong scope
→ Create new token with "Edit zone DNS" permissions

### "Zone not found"
→ Zone ID is for wrong domain
→ Get Zone ID from hostamar.com zone in Cloudflare

### "Records not updating"
→ Check proxy status: Must be "DNS only" (gray cloud, not orange)

### DNS not propagating
→ Flush local DNS: `ipconfig /flushdns` (Windows)
→ Wait max 30 minutes
→ Check: https://dnschecker.org/

---

## ✅ Verification Checklist

After running setup script:
- [ ] A record: hostamar.com → 76.76.21.21
- [ ] CNAME: www.hostamar.com → cname.vercel-dns.com
- [ ] Records show "DNS only" (gray cloud icon)
- [ ] Wait 5-10 min
- [ ] Vercel: Add hostamar.com domain
- [ ] Vercel: Click "Verify"
- [ ] Test: https://hostamar.com loads

---

## 💡 Quick Reference Commands

```bash
# WSL - Run automation
node /mnt/c/Users/romel/hostamar-local/scripts/cloudflare-setup.js

# Windows CMD - Set credentials temporarily
set CLOUDFLARE_API_TOKEN=your_token
set CLOUDFLARE_ZONE_ID=your_zone_id

# PowerShell - Set credentials
$env:CLOUDFLARE_API_TOKEN = "your_token"
$env:CLOUDFLARE_ZONE_ID = "your_zone_id"

# Windows - Run PowerShell script
powershell -ExecutionPolicy Bypass -File scripts\cloudflare-connect.ps1
```

---

**Status:** Automation scripts ready | Credentials needed  
**Cost:** $0 | **Time:** ~15 minutes  
**Success:** DNS records will be automatically configured

_romelraisul - Let's execute!_ 🚀