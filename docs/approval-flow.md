# Deployment Approval Flow

This document describes the **production deployment approval process** for the Hostamar Admin CI pipeline.

---

## Overview

| Stage | Job | Environment | Gate |
|-------|-----|-------------|------|
| 1 | `notify-approvers` | — | Sends Slack notification when run starts |
| 2 | `re-notify-approvers` | — | Re-notifies after 10 min if still pending |
| 3 | **`deploy-db`** | **production** | **Manual approval required** |
| 4 | `verify-deploy` | production | Runs after approval |

---

## Approval Process

1. **Pipeline starts** → runs Lint, Tests, Grafana import
2. **`notify-approvers` fires** → Slack message with:
   - Branch name
   - Commit SHA (short)
   - Direct link to GitHub Actions run
3. **Pipeline waits** at `environment: production` on `deploy-db` job
4. **After 10 minutes** (if no approval) → `re-notify-approvers` posts a reminder to Slack
5. **Approver clicks "Review deployments"** in GitHub Actions → approves
6. **Pipeline continues** → DB migrations run → post-deploy verification → summary

---

## Slack Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Initial notification | `#hostamar-alerts` (via `SLACK_WEBHOOK_URL`) | Branch, commit, run URL |
| 10-min reminder | Same channel | "Reminder: DB deploy still awaiting approval..." |
| Failure alert | Same channel | Post-deploy verification failure |

---

## How to Approve

1. Open the Slack notification link (or go to **Actions → Runs → [run]**)
2. Click **Review deployments**
3. Select **production** environment
4. Click **Approve and deploy**
5. Pipeline resumes automatically

---

## Required Reviewers

Configure in **Settings → Environments → production → Protection rules**:

- **Required reviewers**: Add GitHub usernames who can approve
- **Wait timer**: 0 minutes (no auto-approve)
- **Deployment branches**: `main` only

---

## Secrets

| Secret | Scope | Purpose |
|--------|-------|---------|
| `SLACK_WEBHOOK_URL` | Repository or Environment | Slack incoming webhook for notifications |
| `PROD_DATABASE_URL` | Environment (production) | Neon DB connection string for migrations |
| `PROD_BASE_URL` | Environment (production) | Vercel production URL for verification |
| `GRAFANA_API_KEY` | Repository | Grafana provisioning API key |
| `GRAFANA_URL` | Repository | Grafana Cloud instance URL |

---

## Escalation Timing

| Time after pipeline start | Action |
|---------------------------|--------|
| 0 min | Initial Slack notification |
| 10 min | First reminder (re-notify) |
| 30 min | (Optional) Second reminder — add another job if needed |
| 60 min | (Optional) Page on-call via PagerDuty — add job if needed |

*Adjust `sleep` duration in `re-notify-approvers` step to change timing.*

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No Slack notification | Check `SLACK_WEBHOOK_URL` secret exists and is valid |
| Pipeline never reaches approval | Check `deploy-grafana` and `notify-approvers` passed |
| Approval not working | Ensure reviewer is in "Required reviewers" list |
| `gh api` fails in re-notify | Runner needs `gh` CLI (pre-installed on `ubuntu-latest`) |

---

## Quick Commands

```bash
# Trigger pipeline
gh workflow run hostamar-ci.yml --ref main

# List recent runs
gh run list --workflow hostamar-ci.yml --limit 5

# View run in browser
gh run view <run-id> --web

# Approve from CLI (if you have permission)
gh api -X POST repos/:owner/:repo/actions/runs/<run-id>/pending_deployments \
  -F environment_ids[]=production -F state=approved
```