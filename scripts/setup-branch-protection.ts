#!/usr/bin/env node
// =============================================================================
// setup-branch-protection.ts — apply the main-branch protection rule via the
// GitHub API in one command. Requires the `gh` CLI authenticated
// (`gh auth login`) and `GITHUB_TOKEN` with admin:repo_hook + repo scopes.
//
// Run:  node scripts/setup-branch-protection.ts
//       GH_OWNER=User GH_REPO=hostamar.com node scripts/setup-branch-protection.ts
// =============================================================================
import { execSync } from 'child_process'

const owner = process.env.GH_OWNER || execSync('gh repo view --json owner -q .owner').toString().trim()
const repo = process.env.GH_REPO || execSync('gh repo view --json name -q .name').toString().trim()

const rule = {
  pattern: 'main',
  allows_deletions: false,
  allows_force_pushes: false,
  blocks_creations: false,
  required_approving_review_count: 1,
  dismiss_stale_reviews_on_push: true,
  require_linear_history: false,
  required_status_checks: {
    strict: true,
    contexts: ['Static Guardrails'], // the `guard` job in ai-review.yml
  },
  bypass_pull_request_allowances: { users: [], teams: [], apps: [] },
}

const json = JSON.stringify(rule)
try {
  execSync(`gh api --method PUT repos/${owner}/${repo}/branches/main/protection --input -`, {
    input: json,
    stdio: 'inherit',
  })
  console.log(`OK: branch protection applied to ${owner}/${repo}@main`)
} catch (e) {
  console.error('Failed to apply branch protection. Ensure `gh auth login` and admin rights.')
  console.error('You can also set it manually in GitHub UI — see .github/BRANCH_PROTECTION.md')
  process.exit(1)
}
