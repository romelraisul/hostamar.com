# Cold-isolate 1102 residual — round 3: the jsonwebtoken/bcryptjs lever, applied and measured

Worker `cbad910e-35dc-4873-bab7-a93e89e53c61` → **`b692b295-be96-46d9-bf9f-8e8b4b1f13ed`** (attempt 1/6,
71 assets uploaded, 1053 already server-side, 71.1 s, `ATTEMPT_RC=0`).

## The change (applied, live, verified)

`lib/auth-utils.ts` no longer imports `jsonwebtoken` (CJS) or `bcryptjs` at module scope:

- `signToken`/`verifyToken` are plain HS256 over `node:crypto` (native in workerd via
  `nodejs_compat`, ~0 ms to load) and stay **sync**, so all 34 `verifyToken` callers are untouched.
- `bcryptjs` moved to `await import('bcryptjs')` inside `comparePassword` (already async).
- Wire format is identical to jsonwebtoken's HS256 default (unpadded base64url), so `auth_token`
  cookies already in users' browsers verify unchanged.

Verification, all green:

- `tests/auth-token-interop.mjs` — tokens signed by the old library verify with the new verifier,
  and tokens signed by the new signer verify with `jsonwebtoken`. Both directions.
- `tests/edge-hmac` on **real workerd**, 10/10, reported runtime `Cloudflare-Workers`: buffer
  base64url, old token verifies, `orgId` claim survives, expired / `alg:none` / wrong-secret /
  tampered rejected, own round-trip — plus **new** `comparePassword` true and false, which proves
  the lazy `import('bcryptjs')` resolves inside a bundled worker.
- Bundle graph: **`jsonwebtoken` 0/842 and `bcryptjs` 0/842** built route chunks. Before this
  change every authenticated route chunk inherited them. The only jsonwebtoken left in the function
  directory is Next's own vendored copy (`node_modules/next/dist/compiled/jsonwebtoken`, preview
  mode), not the app auth path.
- Shipped-code proof: the marker `jwt-secret-absent-at-build-time` is present in 203 built files —
  the deployed artifact really contains this code.

## Live measurement — 420 s tail on `b692b295`, 190 invocations, all 190 on `b692b295`

```
outcomes   ok 190 / exceededCpu 0 / 0 exceptions / 0 error logs
client     89 cache-busted requests -> 77x200, 12x401 (cookie-gated), 0x503
cpuTime    p50 42 ms   p90 323 ms   >200 ms 47 (24.7%)   >400 ms 13 (6.8%)   max 801 ms
```

## Verdict: the residual is NOT closed by this change

Same method on the previous worker (`cbad910e`, 125 invocations): ok 124 / **exceededCpu 1 (0.8%)**,
`>400 ms` 11 (8.8%), p90 336 ms, max 670 ms.

- Cold class (`>400 ms`): **8.80% → 6.84%**, z = 0.64, two-sided **p = 0.52** — statistically
  indistinguishable from no change.
- **0 kills in 190 events is not evidence.** Under an unchanged 0.8% rate the chance of a clean
  190-event window is **21.7%**; 95% confidence needs **373** events.
- Max 670 → 801 ms is sample size (max is an extreme statistic: 190 samples vs 125), not a regression.

## Why it could not have worked: cold init is the 40.4 MB bundle, not a 100 KB lib

- `handler.mjs` — what workerd parses/evals per cold isolate — is **40.4 MB**; `worker.js` is 2.3 KB.
- The jsonwebtoken tree is **0.1 MB**. Removing it cannot move a 400–800 ms init band.
- Largest in-graph module trees: **@libsql/client 19 MB** (317/842 route chunks),
  **jsdom 14 MB** (16 chunks — every route importing `lib/api/validator`, i.e. `isomorphic-dompurify`:
  saml/oidc, webhooks/*, voice-token, tools/run, billing/create-checkout, scim),
  **@prisma/client 8.2 MB** (307 chunks), **next-auth 2.4 MB** (198 chunks).
- Local workerd on this exact build: warm `/pricing` 20–55 ms, while the first request after isolate
  init on the same process took 1.08 s — a several-hundred-ms init term, matching the edge cold class.

## Next lever, ranked

1. **Instrument init before more surgery** — module-scope `t0` + one log line of `init_ms` on the
   first request per isolate. This turns a 0.8% kill statistic (needs 373+ events) into a direct
   per-isolate number. Nothing else should be attempted before this exists.
2. **jsdom (14 MB) → 16 route families** via `lib/api/validator`: lazy-load the sanitize path so
   webhooks / checkout / tools / voice-token cold starts stop paying for jsdom.
3. **@libsql/client 19 MB in 317 chunks, @prisma/client 8.2 MB in 307** — largest blast radius;
   the turso-edge migration is the path.
4. **Housekeeping, no CPU effect:** 362 MB of `public/` (tv/*.mp4, 10–20 MB each, largest 19.9 MB)
   sits inside the server-function upload; the >25 MB prune only trims the biggest. Upload-time win only.

Do not re-run a single clean tail and call this fixed: at 0.8%, a clean 190-event window happens
21.7% of the time by luck.
