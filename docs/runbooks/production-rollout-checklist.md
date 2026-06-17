# Production Rollout Checklist

## Pre-Rollout (T-7 days)
- [ ] Run full Postman suite locally: `.\scripts\run-ci-locally.ps1`
- [ ] All tests pass (access control, model API, billing security, observability)
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] Build: `npx next build`
- [ ] Incident drills completed (OOM + DMR down)
- [ ] Grafana dashboards imported and alerts firing to Slack/PagerDuty
- [ ] Audit schema applied to staging and verified:
  ```bash
  psql "$STAGING_DATABASE_URL" -c "SELECT count(*) FROM admin_audit_logs;"
  ```
- [ ] Admin passwords rotated and stored in secrets manager (1Password/Vault)
- [ ] `NEXTAUTH_SECRET` rotated and stored in CI secrets
- [ ] `.env` scrubbed from git history if ever committed

## Rollout Day (T-0)
### 1. Database
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Apply audit schema: `psql "$PROD_DATABASE_URL" -f database/audit-schema.sql`
- [ ] Verify migration: `npx prisma migrate status`

### 2. Environment
- [ ] Set production env vars in hosting platform (Vercel/Railway):
  ```
  NEXTAUTH_URL=https://hostamar.com
  NEXTAUTH_SECRET=<from-secrets-manager>
  DATABASE_URL=<prod-db-url>
  NODE_ENV=production
  ```
- [ ] Enable HTTP→HTTPS redirect
- [ ] Set CSP headers (see below)

### 3. Deploy
- [ ] Push to `main` — CI runs:
  - [ ] Lint & TypeCheck ✅
  - [ ] Unit tests ✅
  - [ ] Integration tests ✅
  - [ ] DB migrations ✅
  - [ ] Grafana import ✅
- [ ] Wait for CI green check
- [ ] Verify app: `curl -sI https://hostamar.com/login | head -5`
- [ ] Verify admin: `curl -sI https://hostamar.com/admin | head -5`

### 4. Verify
- [ ] Log in as admin
- [ ] Chat with smollm3 model
- [ ] Confirm `/admin/models` shows correct VRAM
- [ ] Check Grafana dashboard loads
- [ ] Simulate failed login — confirm rate limiting
- [ ] Perform an admin action — confirm audit log entry created

## Rollback Plan
### Trigger conditions
- > 5% error rate in first hour
- Model API returns 5xx for > 2 min
- Payment flow broken

### Steps
```bash
# 1. Revert deployment
git revert HEAD --no-edit
git push origin main

# 2. Roll back database (if migration was applied)
npx prisma migrate reset --force

# 3. Notify team
# 4. Announce status page
```

## Post-Rollout (T+24h)
- [ ] Monitor Grafana for 24h — no alert spikes
- [ ] Check audit log for suspicious activity
- [ ] Run Postman suite against production
- [ ] Update runbook with any lessons learned

## Security Headers Template
```nginx
# nginx.conf or Vercel headers.json
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' http://localhost:12434 http://localhost:11434;
  font-src 'self' data:;
" always;
```
