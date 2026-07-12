# Enterprise SSO — SAML 2.0 (Tenant-Specific)

**Status:** Shipped · BoxyHQ Jackson · closes procurement checklist line 1.
**Support:** sales@hostamar.com / enterprise@hostamar.com

---

## Procurement checklist — answers

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | SAML 2.0 | **Yes.** We implement SAML 2.0 only (no OIDC/Google as a primary IdP; those are consumer options, not enterprise IdP). |
| 2 | Tenant-specific SSO | **Yes.** Each organization (`Organization`) has its own IdP connection (`SamlConnection`): own Entity ID, own IdP SSO URL, own X.509 signing cert. Acme's Okta ≠ Globex's Entra ID. |
| 3 | IdP-initiated + SP-initiated | **Yes.** SP metadata is published per tenant at `/api/auth/saml/metadata?tenant={slug}` (IdP-initiated reads it). SP-initiated: `/api/auth/saml/login?tenant={slug}` redirects to the IdP. ACS `/api/auth/saml/acs?tenant={slug}` validates the POST. |
| 4 | Okta / Microsoft Entra ID (Azure AD) / OneLogin | **Yes.** Any standards-compliant IdP that consumes SAML 2.0 SP metadata works. We provide you the SP Entity ID + ACS URL; you paste your IdP metadata XML (or URL) into our admin panel. |
| 5 | Just-In-Time (JIT) user provisioning | **Yes.** On first SAML login we auto-create the `Customer` (email + name from assertions), stamp `ssoId`/`ssoProvider`, and link a `Membership` to your org. Subsequent logins map to the same account. |
| 6 | Enforce SSO per organization | **Yes.** Set `ssoEnforced=true` for your org + domain. Password login for `@yourdomain` emails is blocked at `/api/auth/login` and redirected to your IdP. The issued session is tagged `ssoEnforcedTenant` so only SAML sessions enter. |
| 7 | SCIM user lifecycle (deprovisioning) | **Roadmap Q4 2026.** JIT covers provisioning + daily login sync today. Automated deprovisioning/role-sync via SCIM 2.0 is on the roadmap — tracked as procurement lines 2–3. |

---

## How to connect your IdP (admin)

1. Go to **Admin → SSO** (`/admin/sso`).
2. Enter your **tenant slug** (e.g. `acme-corp`), **org name**, and **email domain** (e.g. `acme.com`).
3. Paste your **IdP metadata XML** (or enter the metadata URL and click *Fetch*).
4. Toggle **Enforce SSO** if you want to disable password login for your domain.
5. Click **Save connection** — we register it with Jackson and show your SP config:

```
Entity ID : https://hostamar.com/api/auth/saml/metadata?tenant=acme-corp
ACS URL   : https://hostamar.com/api/auth/saml/acs?tenant=acme-corp
Metadata   : https://hostamar.com/api/auth/saml/metadata?tenant=acme-corp
```

6. In your IdP (Okta/Azure/OneLogin), create a SAML app using the **Entity ID** as the Audience and the **ACS URL** as the Single Sign-On URL.
7. Click **Test login → IdP** to verify the round-trip.

---

## Architecture

- **Engine:** BoxyHQ Jackson (`@boxyhq/saml-jackson`), self-hosted in our Postgres (`_jackson_*` tables). XML signature, audience, time-window and replay protection are all handled by Jackson — we never parse SAML ourselves.
- **Dual store:**
  - `SamlConnection` (Prisma) — tenant config UI, domain discovery, enforce flag.
  - Jackson's own tables — the live SAML validation engine (keyed by `tenant=slug`, `product=hostamar`).
- **Flow:**
  1. SP-initiated → `/api/auth/saml/login?tenant=` → Jackson `authorize` → redirect to IdP.
  2. IdP POSTs assertion → `/api/auth/saml/acs?tenant=` → Jackson `samlResponse` (validates signature) → 302 to `/api/auth/saml/callback?code=`.
  3. Callback → Jackson `token` + `userInfo` → `mapProfile` → `jitProvision` → `auth_token` cookie set → redirect to app.
- **Session:** we mint the app's standard `auth_token` JWT (same cookie middleware validates), tagged with `ssoProvider='saml:<slug>'` and `ssoEnforcedTenant` when enforced.
- **Middleware:** the SAML endpoints (`metadata`, `acs`, `callback`) are in `selfGuardedPaths` — they're server-to-server / cross-site IdP redirects, so they correctly bypass cookie auth.

---

## Security notes

- No `verify:false` / `rejectUnauthorized:false` anywhere in the SSO path.
- IdP signing certs live in Jackson's encrypted-at-rest Postgres tables, never in client code.
- Failed signature / audience / replay validation in Jackson returns the user to `/login?sso_error=…` — never a silent pass.
- `SamlConnection` registration is atomic with Jackson: if Jackson registration fails, the connection is marked inactive and the save is rejected.

---

## Environment variables (production)

```
NEXTAUTH_URL=https://hostamar.com          # used to build Entity ID / ACS URLs
NEXTAUTH_SECRET=***                        # session signing
JWT_SECRET=***                             # app auth_token signing
DATABASE_URL=***                           # Jackson stores _jackson_* tables here (same Postgres)
```

---

## Manual verification (post-deploy, on VPS)

1. Create an org + connection in `/admin/sso` using a **samltest.id** test IdP.
2. `curl https://hostamar.com/api/auth/saml/metadata?tenant=acme-corp` → valid SP metadata XML.
3. `curl -i "https://hostamar.com/api/auth/saml/login?tenant=acme-corp"` → 302 to the IdP.
4. Complete login at the IdP → land on `/dashboard` with a valid `auth_token`.
5. Set `ssoEnforced=true` + domain, then `POST /api/auth/login` with a `@domain` email → `403 sso_required` + `ssoLoginUrl`.
