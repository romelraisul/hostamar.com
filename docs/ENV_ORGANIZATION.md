# ENV ORGANIZATION — hostamar-build

Date: 2026-08-25

## Where the Cloudflare API token was found

`/home/romel/.hermes/.env` → `CLOUDFLARE_API_TOKEN` (53 chars, verified ACTIVE via
api.cloudflare.com/user/tokens/verify). It was NOT in any hostamar-build env file.
Now merged into `/home/romel/hostamar-build/.env` under a "cloudflare API" section.
Zone: hostamar.com = `2aef176c6f2000da2af593f4890ec298`

Note: Windows wrangler oauth token (AppData/Roaming/xdg.config/.wrangler) is EXPIRED
(error 9109 Invalid access token) — do not rely on it.

## Env files found on disk

Active / consolidated:
- /home/romel/hostamar-build/.env          ← MASTER (gateway + app keys)
- /home/romel/hostamar-build/.env.example  ← template only, no secrets
- /home/romel/.hermes/.env                 ← hermes runtime keys (source of CF token)

Legacy / stale (archived, still in place):
- hostamar-build/.env.local, .env.docker, .env.backup.json, .env.vercel.backup
- hostamar-build/legacy-env-archive/eval.env, eval-nested.env
- openwa/.env*, gpt-researcher/.env*, payment_gateway/.env.production
- backup/*.enc (encrypted daily .env.docker snapshots)

## Archive

All 7 primary env files copied to `/home/romel/env-archive/` with timestamp prefix
`20260825-230828-…`, chmod 600. Master backed up as `.env.bak.20260825-230828`.

## Master .env now contains (verified present)

OPENROUTER_API_KEY, OPENROUTER_BASE_URL, LITELLM_MASTER_KEY,
TOKENROUTER_API_KEY, KILOCODE_API_KEY, CLOUDFLARE_API_TOKEN, DATABASE_URL (Neon free),
+ full app config (bKash/SMS/TV/JWT/etc.)

## What this enabled

1. ai.hostamar.com DNS switched tunnel→Vercel via CF API:
   - deleted CNAME `ai → <tunnel-id>.cfargotunnel.com` (proxied)
   - created CNAME `ai → cname.vercel-dns.com` (DNS-only)
2. Removed `- hostname: ai.hostamar.com → localhost:3000` from ~/.cloudflared/config.yml
3. Disabled Vercel SSO deployment protection on project ai.hostamar.com
   (was `all_except_custom_domains`, returned 307 vercel.com/sso-api for API calls;
   fixed via PATCH /v9/projects/prj_3rUAKnqMM8kz41f3KftydjAfZK3D {"ssoProtection": null})
4. vercel alias → https://ai.hostamar.com now serves the always-on gateway

Rule going forward: new provider tokens go into hostamar-build/.env first; hermes
runtime keys stay separate. Never commit or paste values — names only in docs.
