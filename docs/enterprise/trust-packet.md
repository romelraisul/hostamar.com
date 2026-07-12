# Hostamar Trust Packet (Enterprise Procurement)

> For security & procurement teams evaluating Hostamar. Every claim maps to an auditable commit on `main`.

## Product surface (all on one ৳3500/mo subscription)

7 products — Video, Hosting, Chat, Browser, IDE, Game, Voice — plus SAML SSO, 3-tier support, and a public status page.

## Security & reliability evidence

| Control | Evidence | Commit |
|---|---|---|
| CI/CD pipeline (typed, linted, drift-checked builds) | `.github/workflows` + gate suite | **5d5f827** |
| Tenant isolation audit (cross-tenant leak tests) | `__tests__/tenancy.leak.test.ts` | **988e14a** |
| Input validation (API request validation) | `__tests__/api-validation.test.ts` | **dcddc73** |
| Tenant isolation shipped (Organization = tenant, per-row FK) | `prisma/schema.prisma` + middleware | **b6ad042** |
| SCIM 2.0 + OIDC (per-tenant provisioning) | `app/api/scim/v2/*`, `app/api/auth/oidc/*` | **8ddf15e** |
| bKash tokenized checkout + Payment→Org money linkage | `lib/payment/bkash.ts`, `app/api/billing/*` | **65ee095** |
| $0 self-hosted Voice (LiveKit + Coturn, survives reboot) | `docker-compose.prod.yml`, `scripts/rotate-turn-cert.sh` | **50b8c7e** |
| Schema drift | `scripts/check-schema-drift.js` → **0 violations**, 14 migrations | (all above) |
| 3-tier support + incident response | `lib/support/*`, `/admin/support/triage` | **b6ad042** |

## SAML SSO (per-tenant)

- Setup guide: `docs/enterprise/sso.md`
- SP Entity ID: `https://hostamar.com/api/auth/saml/metadata?tenant={slug}`
- ACS URL: `https://hostamar.com/api/auth/saml/acs?tenant={slug}`
- Each tenant is isolated (Organization model, Membership-scoped access).

## Live proof (self-serve)

- Status page: `/status` (public, per-product green/yellow/red, 30s cache)
- Runbooks / SOPs: `/docs/sops` (generated from real infra)
- Admin diagnostics: `/api/admin/diagnostics` (admin-guarded)

## Data & payments

- Payments via bKash / Nagad / Rocket (local rails) + USDT option.
- Data residency: self-hosted infra (Postgres, Redis, app, nginx per `docker-compose.vps.yml`).

## Verification gates (as of 50b8c7e)
- `tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors
- `vitest run` → 19/19 passing
- schema drift → 0
- `npm run build` → ✓ compiled, Middleware 25.8 kB

**Contact:** procurement@hostamar.com — reply with your SSO checklist and we'll map each item to the commit above.
