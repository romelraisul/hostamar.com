# CLOUDFLARE BOT FIX — hostamar.com

Date: 2026-08-26

## Done automatically (via CF API)

1. **security.txt** — code fix, deployed:
   - `app/.well-known/security.txt/route.ts` (Next.js route, 200 text/plain)
   - `public/.well-known/security.txt` fallback
   - Verify: `curl https://hostamar.com/.well-known/security.txt`

2. **DMARC** — TXT record created via API:
   ```
   _dmarc.hostamar.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@hostamar.com; ruf=mailto:dmarc@hostamar.com; fo=1; pct=100"
   ```

3. **SPF** — already present (no action):
   ```
   hostamar.com  TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"
   ```

## Manual in Cloudflare dashboard (~2 min) — token lacks Bot Management scope

The stored CF API token is DNS-scoped only. Bot Fight Mode + AI Labyrinth need
one-time dashboard clicks (Free plan):

1. **Bot Fight Mode**: Dashboard → hostamar.com → Security → Bots → Configure
   → Bot Fight Mode = ON. Verified bots are allowed by default on Free.
2. **AI Labyrinth**: same page → AI Labyrinth = ON.

(If the plan is ever upgraded to Pro: use Super Bot Fight Mode instead —
Definitely automated: Block, Likely automated: Managed Challenge,
Verified bots: Allow, plus "Block AI Scrapers".)

## WAF custom rules (paste into Security → WAF → Custom rules)

Rate limiting rules live under Security → WAF → Rate limiting rules on Free.

Rule A — protect hosting creation:
```json
{
  "expression": "(http.request.uri.path contains \"/api/hosting/servers\" and http.request.method eq \"POST\")",
  "action": "block",
  "ratelimit": { "characteristics": ["ip.src"], "period": 60, "requests_per_period": 5, "mitigation_timeout": 600 }
}
```

Rule B — protect video generation:
```json
{
  "expression": "(http.request.uri.path contains \"/api/dashboard/videos\")",
  "action": "block",
  "ratelimit": { "characteristics": ["ip.src"], "period": 60, "requests_per_period": 10, "mitigation_timeout": 300 }
}
```

Rule C — browser proxy challenge (needs bot_management score; Free plan lacks
cf.bot_management — substitute with JS challenge for everyone except logged-in):
```json
{
  "expression": "(http.request.uri.path contains \"/api/browser/proxy\")",
  "action": "managed_challenge"
}
```

Rule D — verified bots bypass (add as FIRST rule if on Pro+; on Free, BFM
already allows verified bots):
```json
{ "expression": "cf.bot_management.verified_bot", "action": "skip", "action_parameters": { "ruleset": "current" } }
```

## Cache rule

Dashboard → Caching → Cache Rules → new rule:
- If hostname eq hostamar.com AND (path starts with /api/ or /dashboard/) → Bypass cache.

## Turnstile on signup/login (recommended follow-up)

Cloudflare Turnstile (free) widget on /signup + /login forms; verify server-side
in app/api/auth/register + login before creating accounts. This stops scripted
account creation like QA bots draining welcome credits.

## Verification commands

```
curl -s https://hostamar.com/.well-known/security.txt        # 200 text/plain
dig TXT _dmarc.hostamar.com +short                            # DMARC record
curl -s -o /dev/null -w "%{http_code}" https://hostamar.com/  # normal users unaffected
```
