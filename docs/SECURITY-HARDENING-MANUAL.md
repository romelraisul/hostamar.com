# Hostamar Security Hardening — Manual Steps (DNS + 2FA)

Generated 2026-07-21. Steps the owner must complete in Cloudflare +
the Hostamar repo. Code-level scaffolding is already in place; these
are the external DNS / secret-rotation steps that an agent cannot do.

## 1. SPF / DKIM / DMARC DNS Records (Cloudflare)

Sign in to Cloudflare → select hostamar.com → DNS → Records. Add:

### SPF (TXT on hostamar.com root)
```
v=spf1 -all
```
(we have no working mail sender yet; -all is correct for now.
Flip to `v=spf1 include:_spf.google.com ~all` if you add Gmail SMTP.)

### DMARC (TXT on _dmarc.hostamar.com)
```
v=DMARC1; p=none; rua=mailto:ceo@hostamar.com; ruf=none; adkim=s; aspf=s
```
- p=none = monitor mode (no reject yet). Move to p=quarantine after
  14 days of clean reports, then p=reject after another 14.
- DKIM: no signing pipeline yet, so add DKIM only when SMTP is wired.

### MTA-STS (TXT on _mta-sts.hostamar.com)
```
v=STSv1; id=20260721
```
Plus a policy file served at https://mta-sts.hostamar.com/.well-known/mta-sts.txt
(deploy via Next.js public/). Contents:
```
version: STSv1
mode: testing
mx: mail.hostamar.com
max_age: 604800
```

These take effect within minutes (no DNS cache invalidation needed on CF).

## 2. SECURITY_HEADERS audit (already done)

nginx config has HSTS, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy. Verified in session 2026-07-19.
No action needed.

## 3. 2FA toggle for admins — code path (deferred for now)

Adding a TOTP second factor needs:
a) Prisma schema migration to add to Customer model:
   - twoFactorSecret String? @unique
   - twoFactorEnabled Boolean @default(false)
   - twoFactorBackupCodes String[]  (store hashes, not plaintext)
b) Routes:
   - POST /api/auth/2fa/setup   -> returns otpauth:// URI
   - POST /api/auth/2fa/verify  -> verifies first TOTP, enables
   - POST /api/auth/2fa/disable -> requires current TOTP + password
c) Modify /api/auth/login:
   - On successful pw, if `twoFactorEnabled` → return
     `{ needsTwoFactor: true, tempToken: <temporary JWT, 5 min> }`
     (do NOT issue `auth_token` cookie yet)
   - Add POST /api/auth/login/2fa that takes tempToken + TOTP code,
     verify, then issue full `auth_token` cookie as today
d) UI: a 6-digit input box on /login when needed + a /dashboard/settings
   page for enable/disable + backup codes display

Estimated work: 1 full day (schema, 4 routes, 2 UI screens, QR code lib).
NOT critical to ship before first paying customer — bKash flow itself
authenticates the merchant transaction (TrxID based), so 2FA is a
'phase 2 hardening' step, not a launch blocker.

## 4. Secret Rotation Checklist (do quarterly)

- [ ] JWT_SECRET in /home/romel/hostamar-build/.env.docker
      (rotate → all sessions die → users re-login; acceptable)
- [ ] SSO_CLIENT_SECRET (only once Google OAuth is configured)
- [ ] BOOTSTRAP_SECRET used by /api/_bootstrap/admin
- [ ] BKASH_APP_SECRET / BKASH_APP_KEY when merchant goes live
- [ ] Tunnel creds ~/.cloudflared/{json,cert.pem} — DO NOT rotate
      (rule: never re-login cloudflared; keys survive wsl shutdown)
- [ ] USDT_WALLET_ADDRESS — no rotation, but verify the address still ours

## 5. Cloudflare Web Application Firewall (WAF)

Cloudflare free tier offers core WAF rules. Enable:
- Managed Ruleset: Cloudflare Managed (free)
- Rate-limiting: throttle /api/auth/* to 10 req/min per IP
- Bot Fight Mode: ON
- Challenge: aplicable to /admin/* (turn on Cloudflare Access or
  use the existing middleware 307 redirect — both work)

Sign in → Cloudflare → Security → WAF → configure.

## 6. DNSSEC

Cloudflare DNS → hostamar.com → DNS settings → DNSSEC = Enable.
Requires registrar-side DS record update (Cloudflare shows you the DS).
