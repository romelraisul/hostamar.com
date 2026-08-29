import { writeFileSync } from 'fs';

const base = 'https://hostamar.com';
const checks = [
  { name: 'home', url: `${base}/`, expect: 200, timing: true },
  { name: 'health', url: `${base}/api/health`, expect: 200, json: true, check: (j) => j.database?.connected === true, field: 'database.connected' },
  { name: 'services-catalog', url: `${base}/api/services/catalog`, expect: 200, json: true, check: (j) => j.total === 50, field: 'total' },
  { name: 'v1-models', url: `${base}/api/v1/models`, expect: 200, json: true, check: (j) => j.data?.length >= 100, field: 'data.length' },
  { name: 'v1-chat', url: `${base}/api/v1/chat/completions`, method: 'POST', body: { model: 'kilo-auto/free', messages: [{ role: 'user', content: 'Reply exactly: Hostamar OK' }], max_tokens: 50 }, expect: 200, json: true, check: (j) => j.choices?.[0]?.message?.content?.length > 0, field: 'choices[0].message.content' },
  { name: 'tv-stable', url: `${base}/api/tv/stable-channels?limit=1`, expect: 200, json: true, check: (j) => j.ok === true && j.items?.length >= 1, field: 'ok' },
  { name: 'storage', url: `${base}/api/storage`, headers: { 'x-user-id': 'audit-customer-001' }, expect: 200, json: true, check: (j) => j.storage?.quota === 5368709120, field: 'storage.quota' },
  { name: 'support-chat', url: `${base}/api/support/chat`, method: 'POST', body: { messages: [{ role: 'user', content: 'bKash payment help' }] }, expect: 200, json: true, check: (j) => j.reply?.includes('01822417463') || j.model, field: 'model' },
  { name: 'og-image', url: `${base}/opengraph-image`, expect: 200, head: true },
  { name: 'og-meta', url: `${base}/`, expect: 200, grep: 'property="og:image" content="[^"]*opengraph-image' },
  { name: 'dashboard', url: `${base}/dashboard`, expect: 200 },
  { name: 'ai-services', url: `${base}/dashboard/ai-services`, expect: 200 },
  { name: 'chat', url: `${base}/dashboard/chat`, expect: 200 },
  { name: 'admin-agent', url: `${base}/api/admin/agent?history=1`, expect: 401 },
];

async function run() {
  const results = [];
  for (const c of checks) {
    const start = Date.now();
    try {
      const opts = { method: c.method || 'GET', headers: { ...(c.headers || {}) } };
      if (c.body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(c.body); }
      const res = await fetch(c.url, opts);
      const ms = Date.now() - start;
      const ct = res.headers.get('content-type') || '';
      let body = null, passed = res.status === c.expect, detail = '';
      if (c.head) {
        detail = `${res.headers.get('content-type')} ${res.headers.get('content-length')}B`;
      } else if (c.json && ct.includes('json')) {
        try { body = await res.json(); if (c.check) passed = c.check(body); if (c.field) detail = c.field.split('.').reduce((o, k) => o?.[k], body) ?? ''; } catch {}
      } else if (c.grep) {
        const txt = await res.text();
        passed = new RegExp(c.grep).test(txt);
        detail = passed ? 'found' : 'not found';
      }
      results.push({ name: c.name, status: res.status, passed, ms, detail });
      console.log(`${passed ? '✅' : '❌'} ${c.name} — ${res.status} ${ms}ms ${detail}`);
    } catch (e) {
      results.push({ name: c.name, status: 0, passed: false, ms: Date.now() - start, detail: e.message });
      console.log(`❌ ${c.name} — ERROR ${e.message}`);
    }
  }
  const passCount = results.filter((r) => r.passed).length;
  console.log(`\n==== ${passCount}/${results.length} PASS ====`);
  writeFileSync('up-check-results.json', JSON.stringify({ at: new Date().toISOString(), total: results.length, pass: passCount, results }, null, 2));
  console.log('Saved up-check-results.json');
}

run();
