/**
 * scripts/tv-generate-once.mts — PC-side TV generate trigger.
 * POSTs the real /api/tv/generate-loop (owns prod Redis + BullMQ) with CRON_SECRET
 * from .env.local. The endpoint self-gates: playlist >= 10 items -> skipped:true.
 * Usage: node_modules/.bin/tsx scripts/tv-generate-once.mts
 */
import { readFileSync } from 'fs';

let secret = '';
try {
  const m = readFileSync('.env.local', 'utf8').match(/^CRON_SECRET=(.+)$/m);
  if (m) secret = m[1].trim().replace(/^["']|["']$/g, '');
} catch { /* handled below */ }
if (!secret) {
  console.error('[tv-generate-once] CRON_SECRET not found in .env.local');
  process.exit(1);
}

const res = await fetch('https://hostamar.com/api/tv/generate-loop', {
  method: 'POST',
  headers: { 'x-cron-secret': secret },
  signal: AbortSignal.timeout(120_000),
});
const body = await res.json().catch(() => ({}));
console.log(`[tv-generate-once] HTTP ${res.status}:`, JSON.stringify(body).slice(0, 300));
if (res.status === 200 && (body.ok || body.skipped)) {
  console.log(`[tv-generate-once] OK ${body.skipped ? 'skipped: ' + body.reason : 'generated ' + body.videoId}`);
} else {
  console.error('[tv-generate-once] FAILED');
  process.exit(1);
}
