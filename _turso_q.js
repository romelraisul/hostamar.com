
const { createClient } = require('@libsql/client');
(async () => {
  const url = process.argv[2];
  const token = process.argv[3];
  const client = createClient({ url, authToken: token });
  // Real leads = non-probe emails (not @x.com, not example.com, not harbor)
  const r = await client.execute(
    "SELECT id, name, email, phone, source, status, createdAt FROM Lead WHERE email IS NOT NULL AND email NOT LIKE '%@x.com' AND email NOT LIKE '%example.com' AND email NOT LIKE 'harbor%' AND email NOT LIKE 'probe%' ORDER BY createdAt DESC LIMIT 30"
  );
  console.log("REAL_LEADS:" + JSON.stringify(r.rows));
  // Count total
  const c = await client.execute("SELECT COUNT(*) as n FROM Lead");
  console.log("TOTAL:" + JSON.stringify(c.rows));
  // Orders pending
  const o = await client.execute("SELECT status, COUNT(*) as n FROM \"Order\" GROUP BY status");
  console.log("ORDERS:" + JSON.stringify(o.rows));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
