#!/usr/bin/env node
// local-runner/execute-job.js — V86/V16 heavy-lifter job executor
// Called by keepalive.sh every 5 min with the raw job JSON as argv[2].
// Reports REAL status to the Cloudflare Worker queue — never fake success.

const job = JSON.parse(process.argv[2] || '{}');
console.log('Executing job:', job.type, job.id);

const WORKER_URL = 'https://hostamar-orchestrator.romelraisul.workers.dev';
const REPO = '/home/romel/hostamar-build';
const { execSync } = require('child_process');

async function report(status, result) {
  await fetch(`${WORKER_URL}/api/queue/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: job.id, status, result }),
  });
}

// Run a repo script via tsx (repo scripts import @/lib/* paths via tsx paths support? —
// tsx handles ESM/TS but NOT the '@/' alias, so scripts that need it must run via the
// repo's own Next-aware tooling; tv-generate-once.mts uses relative imports instead.)
function runScript(cmd, timeoutMs) {
  return execSync(cmd, { cwd: REPO, timeout: timeoutMs, encoding: 'utf8' }).slice(-500);
}

async function main() {
  try {
    switch (job.type) {
      case 'tv-generate': {
        // Real TV content generation — RSS -> prompt -> BullMQ render queue.
        // One PC-side trigger of the existing lib/tv/generator.ts pipeline.
        const out = runScript(
          `${REPO}/node_modules/.bin/tsx ${REPO}/scripts/tv-generate-once.mts`,
          9 * 60 * 1000
        );
        await report('done', { ok: true, type: 'tv-generate', tail: out });
        break;
      }
      case 'vercel-guard-cleanup': {
        // Vercel deployment retention guard — runs on GitHub Actions (creds live there,
        // not on this PC). Trigger the manual dispatch; runner does the work.
        const out = execSync(
          `gh workflow run vercel-guard.yml --repo romelraisul/hostamar.com`,
          { timeout: 30_000, encoding: 'utf8' }
        );
        await report('done', { ok: true, type: 'vercel-guard-cleanup', note: 'workflow_dispatch sent', tail: String(out).slice(-200) });
        break;
      }
      default:
        console.log('Job type not implemented:', job.type);
        await report('failed', {
          ok: false,
          error: `${job.type} not implemented on PC — for x/youtube/reddit use POST /api/social/direct from Vercel`,
        });
    }
  } catch (e) {
    console.error('Job failed:', e.message);
    await report('failed', { ok: false, error: e.message });
  }
}

main();
