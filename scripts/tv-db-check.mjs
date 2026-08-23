import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const t = await p.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'Tv%' ORDER BY 1`);
  console.log('TV tables:', JSON.stringify(t));
  const ch = await p.tvChannel.count().catch((e) => 'ERR ' + e.message.slice(0, 80));
  console.log('TvChannel rows:', JSON.stringify(ch));
} catch (e) { console.log('ERR:', e.message.slice(0, 200)); }
await p.$disconnect();
