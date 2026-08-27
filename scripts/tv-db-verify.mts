/**
 * Phase 2 verify: counts on all 7 Tv* tables + Video fallback source.
 */
import { readFileSync } from 'fs';

process.env.DATABASE_URL = readFileSync('.env.local', 'utf8')
  .match(/^DATABASE_URL=(.+)$/m)![1]
  .trim()
  .replace(/^["']|["']$/g, '');

const { prisma } = await import('../lib/prisma');
await prisma.$queryRawUnsafe('SELECT 1');

for (const m of ['tvChannel', 'tvPlaylistItem', 'tvStreamDestination', 'tvSchedule', 'tvSettings', 'tvCommand', 'tvLog'] as const) {
  const c = await (prisma as any)[m].count();
  console.log(`${m}: ${c}`);
}
console.log(`video (fallback): ${(prisma as any).video ? await (prisma as any).video.count() : 'n/a'}`);
await prisma.$disconnect();
