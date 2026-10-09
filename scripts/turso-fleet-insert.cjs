// V78 fleet fallback: the deployed hostamar-pages worker persists fleet POSTs
// via Prisma, which cannot init under workerd (documented constraint) → every
// push since 2026-10-03T22:18Z got a degraded "accepted-*" ack with NO row.
// This helper direct-inserts into Turso via @libsql/client (fetch-only,
// installed at ~/hostamar.com/node_modules). Reads the payload the shared
// fleet-report-push.sh wrote to /tmp/fleet_payload.json.
// Run with: NODE_PATH=~/hostamar.com/node_modules TURSO_FALLBACK_URL=<libsql url> node turso-fleet-insert.cjs
// (.cjs — .mjs forces ES modules where require is undefined; NODE_PATH works for CJS only)
const { createClient } = require('@libsql/client');

const c = createClient({ url: process.env.TURSO_FALLBACK_URL });
const now = new Date().toISOString().replace('Z', '+00:00');
const id = 'direct-' + Date.now();
const payloadPath = process.env.TURSO_FALLBACK_PAYLOAD;
if (!payloadPath) {
  console.log('ERROR: TURSO_FALLBACK_PAYLOAD not set — run via fleet-report-push.sh (per-run payload; shared /tmp file caused cross-lane misattribution 2026-10-04)');
  process.exit(1);
}
const body = JSON.parse(require('fs').readFileSync(payloadPath, 'utf8'));

// V81: field names aligned with the route (camelCase jobId/raw/finished/couldnt/
// needsYou); snake job_id/details only ever filled skeleton columns. Old keys
// kept as fallbacks. BAZAAR 10-09.
const finished = body.finished || body.details || null;
const couldnt = body.couldnt || null;
const needsYou = body.needsYou || null;
const raw = body.raw || finished;

c.execute({
  sql: 'INSERT INTO "FleetReport" ("id","employee","jobId","verdict","finished","couldnt","needsYou","raw","runAt") VALUES (?,?,?,?,?,?,?,?,?)',
  args: [id, body.employee, body.jobId || body.job_id || '', body.verdict || null, finished, couldnt, needsYou, raw, now],
})
  .then(() => console.log('SUCCESS: Turso direct-insert ' + id))
  .catch(e => { console.log('ERROR: Turso insert failed: ' + e.message); process.exit(1); });
