/**
 * Cloudflare Worker orchestrator — V86: Heavy Lifter Brain
 *
 * Queue + D1 + KV + CRON every 5 min. Runs on underutilized machines, NOT Vercel.
 * Jobs: seo-crawl, seo-audit, blog-generate, fb-post, x-post, yt-upload, vercel-guard-cleanup
 *
 * Deploy: wrangler publish (after setting CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN with proper perms)
 */
export interface Env {
  JOBS_QUEUE: Queue;
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_REPO: string;
  GITHUB_TOKEN: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // CRON every 5 min — report — runs on Cloudflare, NOT Vercel
    const pending = await env.DB.prepare(
      "SELECT * FROM jobs WHERE status='pending'"
    ).all();

    const pcOnline = await isPCOffline(env) === false;
    const lastReport = await env.KV.get('last-report');

    // If PC offline, push to GitHub self-hosted runner as backup
    if (pending.results && pending.results.length > 0 && !pcOnline) {
      await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
        method: 'POST',
        headers: { Authorization: `token ${env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'heavy-lifter', client_payload: { jobs: pending.results } }),
      });
    }

    await env.KV.put(
      'last-report',
      JSON.stringify({
        time: Date.now(),
        pending: pending.results?.length || 0,
        pcOnline,
      })
    );
  },

  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    // Vercel frontend proxy — lightweight, NO heavy work
    if (url.pathname === '/api/status') {
      const since = url.searchParams.get('since') || '0';
      const events = await env.DB.prepare(
        'SELECT * FROM jobs WHERE created_at > ? ORDER BY created_at DESC LIMIT 50'
      ).bind(since).all();
      const kv = await env.KV.get('last-report');
      return Response.json({
        events: events.results,
        lastReport: JSON.parse(kv || '{}'),
        pcOnline: (await isPCOffline(env)) === false,
      });
    }

    // Local PC pulls jobs — Serve queued commands
    if (url.pathname === '/api/queue/pull') {
      const jobs = await env.DB.prepare(
        "SELECT * FROM jobs WHERE status='pending' LIMIT 10"
      ).all();
      return Response.json(jobs.results);
    }

    // PC reports job completion
    if (url.pathname === '/api/queue/report') {
      const data = await req.json() as any;
      await env.DB.prepare(
        'UPDATE jobs SET status=?, result=?, reported_at=? WHERE id=?'
      )
        .bind(data.status, JSON.stringify(data.result), Date.now(), data.id)
        .run();
      await env.KV.put(`report:${data.id}`, JSON.stringify(data));
      return Response.json({ ok: true });
    }

    // Vercel frontend pushes job — NO heavy work, just queue
    if (url.pathname === '/api/queue/push') {
      const job = await req.json() as any;
      await env.JOBS_QUEUE.send(job);
      await env.DB.prepare(
        'INSERT INTO jobs (id, type, payload, status, created_at) VALUES (?,?,?,?,?)'
      )
        .bind(crypto.randomUUID(), job.type, JSON.stringify(job.payload), 'pending', Date.now())
        .run();
      return Response.json({ queued: true });
    }

    // PC registers every 10 minutes
    if (url.pathname === '/api/register') {
      const { pcId, ip } = await req.json() as any;
      await env.KV.put(`pc:${pcId}`, JSON.stringify({ ip, lastSeen: Date.now() }), {
        expirationTtl: 15 * 60,
      });
      return Response.json({ registered: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};

async function isPCOffline(env: Env): Promise<boolean> {
  const pcs = await env.KV.list({ prefix: 'pc:' });
  for (const key of pcs.keys) {
    const data = JSON.parse((await env.KV.get(key.name)) || '{}');
    if (Date.now() - data.lastSeen < 15 * 60 * 1000) return false;
  }
  return true;
}
