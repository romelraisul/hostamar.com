# DATABASE — Schema, Clients, and Mirror Chain

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — Turso primary, 773 tables Infisical DB

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TURSO (Primary)                          │
│  libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io        │
│  @libsql/client/web (HTTPS/Hrana over 443)                      │
│  getTursoEdgeClient() → fetch-only, works on workerd + Node     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 6h mirror (GitHub Actions)
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      ┌─────────┐    ┌──────────┐    ┌────────┐
      │ SUPABASE│    │   NEON   │    │  LOCAL │
      │  Postgres│    │ serverless│    │ Podman │
      │  (mirror)│    │  @neondb/ │    │postgres│
      └─────────┘    │ serverless│    │:15432  │
                     │ over 443  │    │(decoy) │
                     └──────────┘    └────────┘
                                          │
                                   ┌──────┴──────┐
                                   ▼             ▼
                              ┌────────┐    ┌─────────────┐
                              │Infisical│    │   Other     │
                              │  (real) │    │  services   │
                              │ :15433  │    │ (forgejo,   │
                              │ 773 tbls│    │  medusa,    │
                              └────────┘    │  teldrive)  │
                                            └─────────────┘
```

---

## Turso (Production Primary)

- **Client:** `@libsql/client/web` (v0.14.0) — fetch-only, HTTPS/Hrana
- **Edge Client:** `getTursoEdgeClient()` in `lib/turso-edge.ts`
  - Singleton pattern
  - Converts `libsql://` → `https://` (avoids WebSocket CPU trap on workerd)
  - Uses `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` from env
- **Why not Prisma on edge:** Prisma 5.22 `fs.readdir` on `/lib` → unenv throws → 1102 Worker CPU limit
- **Local Dev:** Prisma 5.22.0 + `@prisma/adapter-libsql` over `@libsql/client`

---

## Prisma Schema (Key Models)

```prisma
// prisma/schema.prisma (excerpt)
model Customer {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String?  // bcrypt hash
  role      String   @default("customer")
  phone     String?
  credits   Int      @default(3000)
  ssoProvider String?
  ssoEnforcedTenant String?
  mfaSecret String?
  mfaEnabled Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([email])
}

model Video {
  id          String   @id @default(cuid())
  title       String
  url         String
  thumbnail   String?
  duration    Int?
  category    String?
  source      String   @default("b2")
  b2Key       String?
  views       Int      @default(0)
  status      String   @default("published")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([status])
  @@index([category])
}

model TvChannel {
  id          String   @id @default(cuid())
  name        String
  url         String
  logo        String?
  category    String?
  country     String?
  views       Int      @default(0)
  isLive      Boolean  @default(false)
  status      String   @default("active")
  createdAt   DateTime @default(now())
  @@index([country, status])
}

model TvCommand {
  id          String   @id @default(cuid())
  action      String   // START_WEBSITE, START_ALL, STOP, RELOAD_PLAYLIST, GENERATE_VIDEO
  payload     String?  // JSON
  status      String   @default("PENDING") // PENDING, EXECUTING, COMPLETED, FAILED
  createdAt   DateTime @default(now())
  executedAt  DateTime?
  @@index([status])
}

model Order {
  id            String   @id @default(cuid())
  customerId    String
  productId     String
  amount        Int      // credits
  status        String   @default("pending")
  paymentMethod String?  // bkash, nagad, rocket
  transactionId String?
  createdAt     DateTime @default(now())
  @@index([customerId, status])
}

model Payment {
  id            String   @id @default(cuid())
  orderId       String   @unique
  amount        Int
  method        String
  status        String   @default("pending")
  transactionId String?
  gatewayData   Json?
  createdAt     DateTime @default(now())
}
```

---

## Edge Route Pattern (All TV/Admin Routes)

```typescript
// lib/turso-edge.ts
import { createClient } from '@libsql/client/web'

let _client: ReturnType<typeof createClient> | null = null

export function getTursoEdgeClient() {
  if (_client) return _client
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL?.split('?')[0]
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_URL?.split('authToken=')[1]?.split('&')[0]
  if (!raw) throw new Error('TURSO_DATABASE_URL / DATABASE_URL not configured')
  const url = raw.replace(/^libsql:\/\//, 'https://')  // HTTPS = Hrana over fetch
  _client = createClient({ url, authToken })
  return _client
}
```

**Usage in routes:**
```typescript
import { getTursoEdgeClient } from '@/lib/turso-edge'

export async function GET() {
  const db = getTursoEdgeClient()
  const res = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM "Video" WHERE status = ?',
    args: ['published']
  })
  // ...
}
```

---

## Infisical Database (Self-Hosted)

- **Container:** `infisical` (podman) on port 8089
- **Real DB:** `postgres-infisical` on port 15433 (bridge network, 773 tables, 171 secrets)
- **Decoy DB:** `hostamar-postgres` on port 15432 (empty infisical schema)
- **Secrets Mirror:** `/home/romel/automation/infisical.env` (chmod 600, 175 keys including ENCRYPTION_KEY, JWT_AUTH_SECRET)
- **Restore Order:** redis-infisical → postgres-infisical → infisical

---

## Local Podman Databases

| Container | Port | Database | Purpose |
|-----------|------|----------|---------|
| postgres-infisical | 15433 | infisical | **Real** Infisical data (773 tables) |
| hostamar-postgres | 15432 | infisical (empty) | Decoy — port owned by docker hostamar-postgres |
| redis-infisical | 6379 | - | Infisical cache/sessions |
| redis-foundation | 6380 | - | Shared cache for fleet |
| forgejo | 3000 | forgejo | Git mirror (SQLite file) |

---

## Neon (Serverless Fallback)

- **Client:** `@neondatabase/serverless` (fetch over 443)
- **Why not 5432:** DPI blocks port 5432 in Bangladesh
- **URL:** `NEON_DATABASE_URL` in Infisical (format: `postgresql://...`)
- **Usage:** AI video product DB, mirror target

---

## Mirror Chain (6h Schedule)

```yaml
# .github/workflows/mirror-turso.yml (conceptual)
# Currently GATED by GitHub suspension (appeal #4892433)
Turso → Supabase → Neon
  │
  └─ pg_dump / COPY / Prisma migrate deploy
```

---

## Connection Strings (Env Vars)

| Var | Value | Notes |
|-----|-------|-------|
| `TURSO_DATABASE_URL` | `libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io` | Primary |
| `TURSO_AUTH_TOKEN` | `eyJhbG...` | JWT token |
| `DATABASE_URL` | `postgresql://...` | Neon (Prisma local) |
| `INFISICAL_DATABASE_URL` | `postgresql://postgres:***@host.containers.internal:15433/infisical` | Real Infisical DB |

---

## Verification Commands

```bash
# Turso edge client test
node -e "
const { createClient } = require('@libsql/client/web');
const db = createClient({ url: 'https://hostamar-db-romelraisul.aws-us-east-1.turso.io', authToken: '...' });
db.execute('SELECT 1').then(r => console.log('Turso OK:', r.rows));
"

# Infisical DB check
podman exec postgres-infisical psql -U postgres -d infisical -c "\dt" | wc -l  # expect 773

# Prisma generate (local)
npx prisma generate --schema=prisma/schema.prisma
```