#!/usr/bin/env node
// local-runner/execute-job.js — V86 Heavy Lifter job executor
// Called by keepalive.sh every 5 min — heavy tasks — NO VERCEL CPU

const job = JSON.parse(process.argv[2] || '{}');
console.log('Executing job:', job.type, job.id);

const WORKER_URL = 'https://hostamar-orchestrator.romelraisul.workers.dev';

async function report(status, result) {
  await fetch(`${WORKER_URL}/api/queue/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: job.id, status, result }),
  });
}

async function main() {
  try {
    // All job types are placeholders. Real creds live in Vercel env, not on the
    // local PC (commit ab928e6) — report honest failure, never fake success.
    switch (job.type) {
      case 'seo-crawl':
      case 'seo-audit':
      case 'blog-generate':
      case 'fb-post':
      case 'x-post':
      case 'yt-upload':
      case 'vercel-guard-cleanup':
        console.log('Job type not implemented locally:', job.type);
        await report('failed', {
          ok: false,
          error: `${job.type} not implemented on PC — for x/youtube/reddit use POST /api/social/direct from Vercel`,
        });
        break;
      default:
        console.log('Unknown job type:', job.type);
        await report('failed', { ok: false, error: 'unknown type' });
    }
  } catch (e) {
    console.error('Job failed:', e.message);
    await report('failed', { ok: false, error: e.message });
  }
}

main();
