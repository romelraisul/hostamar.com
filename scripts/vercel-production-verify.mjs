#!/usr/bin/env node
/**
 * scripts/vercel-production-verify.mjs
 *
 * Post-publish verification for hostamar.com, run from CI after a push to main.
 *
 * Replaces the previous `vercel deploy --prod` step, which had no
 * VERCEL_PROJECT_ID configured: the CLI then created an UNTETHERED duplicate
 * project (no environment variables), its build died on an empty DATABASE_URL,
 * and it burned Vercel quota. Vercel's Git integration already builds and
 * promotes production for this repo, so CI should verify the result instead of
 * deploying a second time.
 *
 * Checks:
 *   1. Production HTTP health of the public entry points (hard gate).
 *   2. The latest production deployment on the real project is not in ERROR
 *      (advisory: a token/API hiccup only warns).
 */
const TOKEN = process.env.VERCEL_TOKEN || ''
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_WwYkMz8Kk75NN573skKxxWcuMVYi' // hostamar-build
const SITE = process.env.SITE_URL || 'https://hostamar.com'
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 hostamar-ci-verify'
// Must answer 200: static output we serve ourselves.
const CRITICAL = ['/site/index.html', '/site/sitemap.html', '/site/dashboard.html']
// The app root sits behind edge bot protection, so a 403 for the CI runner's
// datacenter IP is expected and not a publish failure.
const SOFT = ['/']

async function httpStatus(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } })
    return r.status
  } catch {
    return 0
  }
}

;(async () => {
  const problems = []

  for (const p of CRITICAL) {
    const status = await httpStatus(SITE + p)
    console.log(`${status === 200 ? 'OK  ' : 'BAD '}${SITE}${p} -> ${status}`)
    if (status !== 200) problems.push(`${p} returned ${status}`)
  }

  for (const p of SOFT) {
    const status = await httpStatus(SITE + p)
    if (status === 200) {
      console.log(`OK   ${SITE}${p} -> 200`)
    } else if (status === 403) {
      console.log(`note ${SITE}${p} -> 403 (edge bot protection, acceptable)`)
    } else {
      console.log(`BAD  ${SITE}${p} -> ${status}`)
      problems.push(`${p} returned ${status}`)
    }
  }

  if (!TOKEN) {
    console.log('warn: VERCEL_TOKEN not set, skipping deployment-state check')
  } else {
    try {
      const r = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=5`,
        { headers: { Authorization: `Bearer ${TOKEN}` } },
      )
      if (!r.ok) {
        console.log(`warn: Vercel API returned ${r.status}, skipping deployment-state check`)
      } else {
        const { deployments = [] } = await r.json()
        const latest = deployments[0]
        if (!latest) {
          console.log('warn: no production deployments returned')
        } else {
          const sha = latest.meta?.githubCommitSha ? latest.meta.githubCommitSha.slice(0, 8) : '-'
          console.log(`latest production deployment: state=${latest.state} sha=${sha} url=${latest.url}`)
          if (latest.state === 'ERROR' || latest.state === 'CANCELED') {
            problems.push(`latest production deployment is ${latest.state} (${latest.url})`)
          }
        }
      }
    } catch (e) {
      console.log(`warn: Vercel API check failed: ${e.message}`)
    }
  }

  if (problems.length) {
    console.error('::error:: Production publish verification failed:')
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  console.log('OK: production publish verified')
})()
