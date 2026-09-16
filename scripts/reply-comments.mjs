#!/usr/bin/env node
/**
 * scripts/reply-comments.mjs — auto-reply worker for X mentions (cron every 5 min).
 *
 * Runs on this PC (no Vercel CPU). Honest by design: if X creds are absent or
 * are placeholders (stub_*), it logs a clear SKIP and exits 0 — it never
 * pretends to have replied.
 *
 * Creds come from the repo env files (.env.local / .env) or the environment.
 * Enables the moment real X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET
 * are present.
 */
import fs from 'fs';
import crypto from 'crypto';

const LOG = '/tmp/comment-replier.log';
function log(m) {
  const line = `[${new Date().toISOString()}] ${m}`;
  fs.appendFileSync(LOG, line + '\n');
  console.log(line);
}

function loadEnv() {
  for (const f of ['/home/romel/hostamar-build/.env.local', '/home/romel/hostamar-build/.env']) {
    try {
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* optional */ }
  }
}
loadEnv();

const CK = process.env.X_API_KEY || '';
const CKS = process.env.X_API_SECRET || '';
const AT = process.env.X_ACCESS_TOKEN || '';
const ATS = process.env.X_ACCESS_SECRET || '';
const BOT_USER_ID = process.env.X_BOT_USER_ID || '';

const cfg = [CK, CKS, AT, ATS];
if (cfg.some(v => !v) || cfg.some(v => v.startsWith('stub_'))) {
  log('SKIP: X creds missing or placeholder (stub_*) — set real X_API_KEY/X_API_SECRET/X_ACCESS_TOKEN/X_ACCESS_SECRET to enable auto-reply');
  process.exit(0);
}

function pct(s) { return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')); }
function oauthHeader(method, url, params) {
  const oauth = {
    oauth_consumer_key: CK, oauth_token: AT, oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'), oauth_version: '1.0',
    ...params,
  };
  const base = [method.toUpperCase(), pct(url),
    pct(Object.keys(oauth).sort().map(k => `${k}=${oauth[k]}`).join('&'))].join('&');
  const sig = crypto.createHmac('sha1', `${pct(CKS)}&${pct(ATS)}`).update(base).digest('base64');
  const signed = { ...oauth, oauth_signature: sig };
  return 'OAuth ' + Object.keys(signed).sort().map(k => `${k}="${pct(signed[k])}"`).join(', ');
}

const REPLY = 'Thanks for watching Hostamar TV! 🙏 Full live channel: tv.hostamar.com';

async function main() {
  if (!BOT_USER_ID) { log('SKIP: X_BOT_USER_ID not set (needed to find our own mentions)'); process.exit(0); }
  const url = 'https://api.twitter.com/2/users/' + BOT_USER_ID + '/mentions';
  const qs = '?max_results=5&tweet.fields=author_id,created_at';
  const res = await fetch(url + qs, { headers: { Authorization: oauthHeader('GET', url, {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { log(`mentions fetch failed HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`); process.exit(0); }
  const items = body?.data || [];
  log(`mentions found: ${items.length}`);
  for (const t of items) {
    const replyUrl = 'https://api.twitter.com/2/tweets';
    const r = await fetch(replyUrl, {
      method: 'POST',
      headers: { Authorization: oauthHeader('POST', replyUrl, {}), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: REPLY, reply: { in_reply_to_tweet_id: t.id } }),
    });
    const rb = await r.json().catch(() => ({}));
    log(r.status === 201 ? `replied to ${t.id}` : `reply ${t.id} failed HTTP ${r.status}: ${JSON.stringify(rb).slice(0, 150)}`);
  }
}
main().catch(e => { log('ERROR: ' + e.message); process.exit(0); });
