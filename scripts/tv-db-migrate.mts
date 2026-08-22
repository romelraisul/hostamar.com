/**
 * Runs the REAL ensureSchema() from lib/ensure-schema.ts via tsx.
 * Usage: npx tsx scripts/tv-db-migrate.mts
 */
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf8');
const m = envFile.match(/^DATABASE_URL=(.+)$/m);
if (!m) { console.error('no DATABASE_URL found'); process.exit(1); }
process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, '');

const { ensureSchema } = await import('../lib/ensure-schema');
console.log('running ensureSchema() ...');
await ensureSchema();
console.log('ensureSchema() completed OK');

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();
const t = await p.$queryRawUnsafe(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'Tv%' ORDER BY 1`
);
console.log('TV tables now:', t.map((r: any) => r.table_name).join(', '));
await p.$disconnect();
