// Postgres backup layer (Supabase primary backup + Neon cold backup).
// NOTE: the live app DB is Turso (libsql via lib/turso-edge.ts + Prisma).
// The Prisma client is generated for sqlite, so it CANNOT talk to postgres —
// these use `pg` Pools directly. Nothing in the app imports this file yet;
// scripts/sync-db.ts and .github/workflows/db-mirror.yml do.
import { Pool } from 'pg'

const make = (url?: string) =>
  url ? new Pool({ connectionString: url, max: 2 }) : null

export const getSupabase = () => make(process.env.SUPABASE_URL)
export const getNeon = () => make(process.env.NEON_URL)
export const getLocalPg = () => make(process.env.LOCAL_URL)
