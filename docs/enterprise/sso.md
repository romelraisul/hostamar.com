# Enterprise SSO — SAML 2.0 + OIDC + SCIM 2.0 (Tenant-Specific)

**Status:** Shipped · BoxyHQ Jackson · closes procurement checklist lines 1, 2, 3.
**Support:** sales@hostamar.com / enterprise@hostamar.com

---

## Procurement checklist — answers

| # | Requirement | Answer |
|---|-------------|--------|
| 1 | SAML 2.0 | **Yes.** SAML 2.0 only as primary enterprise IdP (no OIDC/Google consumer options as a primary IdP). |
| 2 | Tenant-specific SSO | **Yes.** Each `Organization` has its own IdP connection (`SamlConnection` or `OidcConnection`): own Entity ID, own IdP SSO URL, own X.509 signing cert / client secret. Acme's Okta ≠ Globex's Entra ID. |
| 3 | IdP-initiated + SP-initiated | **Yes.** SAML SP metadata is published per tenant at `/api/auth/saml/metadata?tenant={slug}`. OIDC: `/api/auth/oidc/authorize?tenant={slug}` and `/api/auth/oidc/login?tenant={slug}` redirect to the IdP; callback `/api/auth/oidc/callback` completes the code exchange. |
| 4 | Okta / Microsoft Entra ID (Azure AD) / OneLogin | **Yes.** Any standards-compliant SAML 2.0 or OIDC IdP works. We provide the SP config; you paste your IdP metadata (SAML) or issuer/clientId (OIDC). |
| 5 | Just-In-Time (JIT) user provisioning | **Yes.** On first SAML or OIDC login we auto-create the `Customer` (email + name from assertions/userinfo), stamp `ssoId`/`ssoProvider`, and link a `Membership` to your org. |
| 6 | Enforce SSO per organization | **Yes.** Set `ssoEnforced` (SAML) or `oidcEnforced` (OIDC) + domain. Password login for `@yourdomain` emails is blocked at `/api/auth/login` and redirected to your IdP. The issued session is tagged `ssoEnforcedTenant` so only the matching IdP session enters. |
| 7 | SCIM user lifecycle (deprovisioning) | **Yes — shipped.** SCIM 2.0 endpoint at `/api/scim/v2/*` with a per-organization Bearer token (`ScimToken`). Okta/Azure SCIM connector pushes Users + Groups. Deprovisioning is **soft**: removing a user deletes their `Membership` only — the `Customer` and all `Video`/`Payment` rows (scoped by org) remain for audit. |

---

## SCIM 2.0 (automated provisioning / deprovisioning)

**Endpoint base:** `https://hostamar.com/api/scim/v2`
**Auth:** `Authorization: Bearer *** — one rotatable token per organization (`ScimToken` table). The token *is* the tenant: a token for org A can never read or write org B.

| Resource | Method | Purpose |
|----------|--------|---------|
| `/ServiceProviderConfig` | GET | Advertises supported features (filter on, patch/bulk/etag off). |
| `/ResourceTypes` | GET | Lists `User` + `Group`. |
| `/Schemas` | GET | Minimal User schema. |
| `/Users` | GET | List users (`filter=userName eq "a@acme.com"`, `startIndex`, `count`, `attributes`). |
| `/Users` | POST | Provision a user from Okta/Entra (creates `Customer` + `Membership`). |
| `/Users/{id}` | GET/PUT/PATCH/DELETE | Read / replace / patch / **soft-deprovision** a user. |
| `/Groups` | GET | One group per organization; members = its customers. |

**Tenant isolation & safety:**
- Users are scoped via the `Membership` hop (never a `Customer.organizationId` column — tenancy is Membership-based by design).
- `POST /Users` and `PATCH/PUT active:false` sanitize all input via `deepSanitize` (reuse of the validation layer) and enforce the shared 20/min rate limit.
- Deprovisioning (`DELETE`) removes only the `Membership`. The `Customer` record and all its tenant-scoped data (videos, payments) survive for compliance audit — we never hard-delete user data.

**Generating a SCIM token (admin):**
```
POST /api/admin/sso/scim-token  -> { token }   # stored encrypted, shown once
```

---

## OIDC (OpenID Connect)

**Flow:** SP-initiated or IdP-initiated, tenant-scoped, reusing the exact same `auth_token` mint as SAML (`lib/sso/session.ts`). Middleware treats the OIDC-issued token identically — no bounce to `/login`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/oidc/authorize?tenant={slug}` | GET | Jackson `authorize` → 302 to IdP. |
| `/api/auth/oidc/login?tenant={slug}` | GET | IdP-initiated entry → redirect to IdP. |
| `/api/auth/oidc/callback?code=&state=&tenant=` | GET | Code exchange + userInfo → JIT (`jitProvisionOidc`) → `auth_token` cookie set. |

The session is tagged `ssoProvider='oidc:<slug>'` and `ssoEnforcedTenant` when the org has `oidcEnforced=true`. Login discovery at `/api/auth/login` checks the email domain and returns `403 sso_required` with `ssoLoginUrl` pointing to OIDC when OIDC is the enforced method.

---

## How to connect your IdP (admin)

1. Go to **Admin → SSO** (`/admin/sso`).
2. Enter your **tenant slug** (e.g. `acme-corp`), **org name**, and **email domain** (e.g. `acme.com`).
3. **SAML:** paste your **IdP metadata XML** (or enter the metadata URL and click *Fetch*).
   **OIDC:** enter your **issuer**, **clientId**, **clientSecret** (encrypted at rest), and endpoints.
4. Toggle **Enforce SSO** (SAML) or **Enforce OIDC** if you want to disable password login for your domain.
5. Click **Save connection** — we register it with Jackson and show your SP config:

```
# SAML
Entity ID : https://hostamar.com/api/auth/saml/metadata?tenant=acme-corp
ACS URL   : https://hostamar.com/api/auth/saml/acs?tenant=acme-corp
# OIDC
Authorize : https://hostamar.com/api/auth/oidc/authorize?tenant=acme-corp
Callback  : https://hostamar.com/api/auth/oidc/callback?tenant=acme-corp
# SCIM
Base URL  : https://hostamar.com/api/scim/v2   (Bearer token per org)
```

6. In your IdP, create the app (SAML audience = Entity ID; OIDC redirect_uri = Callback; SCIM connector = Base URL + Bearer token).
7. Click **Test login → IdP** to verify the round-trip.

---

## Architecture

- **Engine:** BoxyHQ Jackson (`@boxyhq/saml-jackson`), self-hosted in our Postgres (`_jackson_*` tables). Signature/audience/time/replay validation handled by Jackson — we never parse SAML/OIDC ourselves.
- **Dual store (SAML & OIDC):**
  - `SamlConnection` / `OidcConnection` (Prisma) — tenant config UI, domain discovery, enforce flag.
  - Jackson's own tables — the live SAML/OIDC validation engine (keyed by `tenant=slug`, `product=hostamar`).
- **SCIM store (authoritative):** our Prisma `Customer`/`Membership` are the source of truth for tenant isolation. SCIM Bearer tokens live in `ScimToken` (one per org). Jackson's directory-sync token store is intentionally not used — our models are authoritative (decision B: global automation stays global).
- **Flow (SAML):** `/api/auth/saml/login?tenant=` → Jackson `authorize` → IdP → `/api/auth/saml/acs` → Jackson `samlResponse` → 302 `/api/auth/saml/callback?code=` → `token`+`userInfo` → `jitProvision` → `auth_token`.
- **Flow (OIDC):** `/api/auth/oidc/authorize?tenant=` → Jackson `authorize` → IdP → `/api/auth/oidc/callback?code=` → `token`+`userInfo` → `jitProvisionOidc` → `auth_token`.
- **Session:** we mint the app's standard `auth_token` JWT (same cookie middleware validates), tagged with `ssoProvider` (`saml:<slug>` / `oidc:<slug>`) and `ssoEnforcedTenant` when enforced.
- **Middleware:** SAML + OIDC endpoints and `/api/scim/v2` are in `selfGuardedPaths` — server-to-server / cross-site IdP redirects / SCIM Bearer auth, so they correctly bypass cookie auth.

---

## Security notes

- No `verify:false` / `rejectUnauthorized:false` anywhere in the SSO path.
- IdP signing certs / client secrets live in Jackson's encrypted-at-rest Postgres tables or `clientSecretEncrypted`, never in client code.
- Failed validation in Jackson returns the user to `/login?sso_error=…` — never a silent pass.
- SCIM input is sanitized (`deepSanitize`) and rate-limited (20/min) on every write.
- Deprovisioning is soft by design — user data is never hard-deleted.

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

1. Create an org + connection in `/admin/sso` using a **samltest.id** (SAML) or a test OIDC IdP.
2. `curl https://hostamar.com/api/auth/saml/metadata?tenant=acme-corp` → valid SP metadata XML.
3. `curl -i "https://hostamar.com/api/auth/oidc/authorize?tenant=acme-corp"` → 302 to the IdP.
4. Complete login at the IdP → land on `/dashboard` with a valid `auth_token` (decode → `ssoProvider='oidc:acme-corp'`, `organizationId` present).
5. Set `ssoEnforced=true` (or `oidcEnforced`) + domain, then `POST /api/auth/login` with a `@domain` email → `403 sso_required` + `ssoLoginUrl`.
6. SCIM: `curl -H "Authorization: Bearer ***" https://hostamar.com/api/scim/v2/Users?filter=userName%20eq%20%22a@acme.com%22` → 200 list, only org A users. `DELETE /Users/{id}` → 204, `Membership` gone, `Customer` + videos retained.
