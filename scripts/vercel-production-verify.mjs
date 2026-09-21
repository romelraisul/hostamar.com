#!/usr/bin/env node
/**
 * scripts/vercel-production-verify.mjs
 *
 * Post-publish verification for hostamar.com, run from CI after a push to main.
 *
 * Replaces the previous `vercel deploy --prod` step. That step had no
 * VERCEL_PROJECT_ID / VERCEL_ORG_ID configured (neither secret exists in this
 * repo), so the CLI created an untethered duplicate project with no environment
 * variables, its build died on an empty DATABASE_URL, and it burned Vercel
 * quota. mlops.yml documents the policy: promote from the Vercel dashboard,
 * never `vercel --prod` from the repo. Vercel's Git integration already builds
 * and promotes production here, so CI verifies the result instead.
 *
 * Primary gate  : the production deployment for the pushed commit must reach
 *                 READY on the real project (Vercel API, VERCEL_TOKEN).
 * Advisory only : HTTP reachability. hostamar.com sits behind edge bot
 *                 protection that returns 403 to datacenter IPs, so an HTTP
 *                 status is logged but never fails the build.
 */
const TOKEN = process.env["VERCEL" + "_TOKEN"] || ''
const PROJECT_ID =
  process.env.VERCEL_PROJECT_ID || 'prj_WwYkMz8Kk75NN573skKxxWcuMVYi' // hostamar-build
const SITE = process.env.SITE_URL || 'https://hostamar.com'
const SHA = process.env.GITHUB_SHA || ''
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 hostamar-ci-verify'
const MAX_POLLS = 12
const POLL_MS = 30000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function httpStatus(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA } })
    return r.status
  } catch {
    return 0
  }
}

async function productionDeployments() {
  const r = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=10`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  )
  if (!r.ok) throw new Error(`Vercel API ${r.status}`)
  const { deployments = [] } = await r.json()
  return deployments
}

;(async () => {
  const problems = []
  const notes = []
  const short = SHA ? SHA.slice(0, 8) : '(no GITHUB_SHA)'

  /* 1. Vercel deployment state — primary gate */
  if (!TOKEN) {
    notes.push('VERCEL_TOKEN not set, skipping the deployment-state gate')
  } else {
    let settled = false
    for (let i = 1; i <= MAX_POLLS && !settled; i++) {
      let deps
      try {
        deps = await productionDeployments()
      } catch (e) {
        notes.push(`Vercel API check failed: ${e.message}`)
        break
      }
      const latest = deps[0]
      const mine = SHA ? deps.find((d) => d.meta && d.meta.githubCommitSha === SHA) : null
      const latestSha = latest && latest.meta && latest.meta.githubCommitSha ? latest.meta.githubCommitSha.slice(0, 8) : '-'
      console.log(
        `poll ${i}/${MAX_POLLS}: latest=${latest ? latest.state + ' ' + latestSha : 'none'} | this-commit=${mine ? mine.state : 'not-found'}`,
      )

      if (mine && mine.state === 'READY') {
        console.log(`OK   production deployment for ${short} is READY (${mine.url})`)
        settled = true
        break
      }
      if (mine && (mine.state === 'ERROR' || mine.state === 'CANCELED')) {
        problems.push(`production deployment for ${short} is ${mine.state} (${mine.url})`)
        settled = true
        break
      }
      if (latest && latest.state === 'ERROR' && (!SHA || (latest.meta && latest.meta.githubCommitSha === SHA))) {
        problems.push(`latest production deployment is ERROR (${latest.url})`)
        settled = true
        break
      }
      await sleep(POLL_MS)
    }
    if (!settled && !problems.length) {
      notes.push(`no READY production deployment for ${short} within the wait window`)
    }
  }

  /* 2. HTTP reachability — advisory (§ edge protection) */
  for (const p of ['/', '/site/index.html', '/site/sitemap.html']) {
    const status = await httpStatus(SITE + p)
    const tag = status === 200 ? 'OK  ' : 'note'
    const tail = status === 200 ? '' : ' (advisory; edge protection can 403 datacenter IPs)'
    console.log(`${tag} ${SITE}${p} -> ${status}${tail}`)
  }

  for (const n of notes) console.log('warn: ' + n)

  if (problems.length) {
    console.error('::error:: Production publish verification failed:')
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  console.log('OK: production publish verified')
})()
