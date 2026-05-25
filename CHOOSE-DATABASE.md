# 🗄️ DATABASE FIX - POSTGRESQL REQUIRED

## Why SQLite Doesn't Work on Vercel

Vercel uses **serverless functions** that have **ephemeral file systems**.
- SQLite uses a local file (`dev.db`) that gets **deleted after each deployment**
- Your data would be lost on every deploy
- Vercel disables file-based databases

**Solution:** Use cloud PostgreSQL (persistent storage)

---

## ✅ **INSTALL POSTGRESQL - CHOOSE ONE:**

### Choice 1: Neon (RECOMMENDED) ← Easiest + Free
```
1. Go: https://neon.tech
2. Sign up with GitHub (free)
3. Create project: hostamar-db
4. Copy connection string
5. Paste into Vercel env vars as DATABASE_URL
```

### Choice 2: Supabase
```
1. Go: https://supabase.com
2. Sign up (free tier)
3. New project → hostamar-db
4. Settings → Database → Connection string
5. Copy → Paste into Vercel as DATABASE_URL
```

### Choice 3: Prisma Postgres (Vercel's own)
```
1. Go: https://vercel.com/dashboard/stores/postgres
2. Click "Prisma Postgres" (not the generic PostgreSQL)
3. Create: hostamar-db
4. Copy connection string
5. Paste into Vercel as DATABASE_URL
```

---

## 🚀 **AUTOMATED FIX SCRIPTS:**

| Script | Purpose |
|--------|---------|
| `NEON-SETUP.bat` | Guides through Neon setup |
| `AUTO-FIX-DB.bat` | Applies fix after you have connection string |
| `COMPLETE-DATABASE-FIX.bat` | Full automation |
| `DATABASE-FIX-GUIDE.md` | Full instructions |

---

## ⚡ **FASTEST PATH:**

1. **Run:** `NEON-SETUP.bat` - Opens Neon, guides setup
2. **Copy:** Connection string from Neon dashboard
3. **Paste:** Into Vercel environment variables (DATABASE_URL)
4. **Run:** `AUTO-FIX-DB.bat` OR `COMPLETE-DATABASE-FIX.bat`
5. **Done:** Registration will work!

---

## 📝 **Manual Fix (If you don't want to use scripts):**

### Step 1: Create Neon DB
https://neon.tech/signup → Create `hostamar-db` → Copy URL

### Step 2: Set Vercel Env Vars
```
https://vercel.com/dashboard/projects/hostamar-local/settings/environment-variables

Add:
DATABASE_URL = postgres://...
JWT_SECRET = hostamar-secret-2026-change-in-production
NEXTAUTH_SECRET = hostamar-nextauth-secret-2026
NEXTAUTH_URL = https://hostamar.com
```

### Step 3: Migrate & Deploy (via terminal)
```bash
cd C:\Users\romel\hostamar-local
npx prisma generate
npx prisma migrate deploy
vercel --prod
```

---

## ❓ **Which to choose?**

| Provider | Free? | Serverless? | Easy? | Vercel Integration |
|----------|-------|-------------|-------|-------------------|
| **Neon** | ✅ 500MB | ✅ Yes | ⭐⭐⭐⭐⭐ | Good |
| **Supabase** | ✅ 500MB | ✅ Yes | ⭐⭐⭐⭐ | Good |
| **Prisma Postgres** | ❌ No free | ✅ Yes | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Turso** | ✅ Free | ✅ Yes | ⭐⭐⭐⭐ | Good |

**Recommendation: Neon** - simplest, generous free tier, no credit card required.

---

## 🎯 **GET STARTED NOW:**

**Double-click:** `NEON-SETUP.bat`

It will walk you through everything! 🚀
