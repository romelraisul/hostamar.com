# SECURITY — Secret Store, WAF, Private Bucket, Token Hygiene

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — Zero paid services, all secrets in Infisical

---

## Secret Store: Self-Hosted Infisical

- **URL:** `http://127.0.0.1:8089` (podman)
- **Project ID:** `e4408ffd-c8a8-4a7e-af71-6e902d553b16` / `23fc7fdf-b48e-4599-bd38-f079a698255f`
- **Real DB:** `postgres-infisical` on port 15433 (bridge, 773 tables, 171 prod secrets)
- **Decoy DB:** `hostamar-postgres` on port 15432 (empty infisical schema)
- **Env Mirror:** `/home/romel/automation/infisical.env` (chmod 600, 175 keys including `ENCRYPTION_KEY`, `JWT_AUTH_SECRET`)
- **Restore Order:** `redis-infisical` → `postgres-infisical` → `infisical`

---

## WAF Rules (Cloudflare)

| Rule | Action | Scope |
|------|--------|-------|
| Rate Limit | Block | 100 req / 10s per IP (zone) |
| Bot Fight Mode | Managed Challenge | AI scrapers |
| API WAF | Scripted | `scripts/add-api-waf-rules.sh` |

**Debugging:** Check WAF/bot rules before touching code when seeing mysterious 429/403.

---

## Private Bucket Policy (PERMANENT)

- **Bucket:** `hostamar-prod` (B2, us-east-005, 1.7GB/10GB, 324 mp4)
- **Delivery:** Cloudflare Worker → AWS SDK S3Client → `getSignedUrl` (SigV4) → Bandwidth Alliance free egress
- **Public Toggle:** **PERMANENTLY REJECTED** — do not revisit, do not "temporarily" flip
- **If 403:** Fix signing flow, NOT bucket policy

---

## Auth Security

### Custom JWT (HS256)

```typescript
// lib/auth-utils.ts — ULTRA-DEFENSIVE verifyToken
export function verifyToken(token: unknown): VerifyPayload | null {
  if (!token) return null
  if (typeof token !== 'string') return null
  if (token.length < 10) return null
  try {
    const parts = token.split('.')
    if (!parts || parts.length !== 3) return null
    const [h, p, s] = parts
    if (!h || !p || !s) return null
    const expectedSig = createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')
    if (s.length !== expectedSig.length) return null
    if (!timingSafeEqual(Buffer.from(s), Buffer.from(expectedSig))) return null
    // ... decode + parse
  } catch { return null }
}
```

### NextAuth: **REMOVED FROM WORKER**

- `/api/auth/[...nextauth]/route.ts` returns 501 stub
- No NextAuth dependencies in worker bundle
- Custom JWT only via `lib/auth.ts` + `lib/auth-utils.ts`

### Admin Guard

```typescript
// lib/auth.ts
export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) throw new Error('UNAUTHORIZED', { cause: { status: 401 } })
  if (user.role !== 'admin' && user.role !== 'ADMIN' && user.role !== 'superadmin') {
    throw new Error('FORBIDDEN: admin only', { cause: { status: 403 } })
  }
  return user
}
```

---

## Token Hygiene

| Token | Location | Rotation |
|-------|----------|----------|
| Cloudflare API Token | Infisical only | Regen → Infisical → env mirror → redeploy |
| B2 Application Keys | Infisical + wrangler secrets | `wrangler secret put` |
| Turso Auth Token | Infisical + wrangler vars | Update in Infisical → redeploy |
| TV_AGENT_SECRET | Infisical + wrangler vars + .tv-agent-secret.local | Sync all three |
| NEXTAUTH_SECRET | Infisical + wrangler vars | `hostamar-docker-local-dev-secret-2026` |

**NEVER:**
- Commit secrets to git
- Paste token values in chat/logs/docs
- Use `process.env.X || 'literal'` fallbacks on auth paths — fail closed instead

---

## DNS Guard

- **AAAA 100::** — Cloudflare Pages managed proxies, **NEVER DELETE**
- DNS edits via script with review, not ad-hoc dashboard clicks

---

## Money Constraints (HARD)

- **Zero paid services, no card on file, anywhere**
- Every component must run on free tier
- bKash tokenized checkout: **PENDING** — no payment path in production until live
- No test charges allowed

---

## Secrets-in-Code Discipline

- New code: no fallback secret literals on auth paths
- Displayed outputs sometimes redact secret-looking strings — verify on-disk bytes with `od -c` / `grep -c` before "fixing"
- Python heredoc for mask-safe extraction (see DEPLOYMENT.md)

---

## TV Agent Secret

- **Value:** `686dc8917e2d30103bc67b1c931adedd239e5a69a6274d9b`
- **Locations:** `wrangler-pages.toml` `[vars]`, `.tv-agent-secret.local`, Infisical
- **Usage:** `/api/tv/agent/commands?secret=...` header `x-agent-secret`