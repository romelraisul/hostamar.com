# Vercel Usage — This Month + Today

Date: 2026-08-27 (Thursday) UTC+6
Project: hostamar-build (romelraisul-8939s-projects) — alias hostamar.com + ai.hostamar.com
Build: 87.7kB first load, Middleware 26kB, Ready r38ps1pc1 (64d3962 Bearer fix) — latest Ready njfbsi6yd superseded, new 20fa804 pending 100/day reset ~02:00 UTC+6

## Today (2026-08-27 (Thursday) UTC+6)
- Deployments: **~12 today** / 100 limit → **88 left today** (quota resets ~02:00 UTC+6). `vercel ls --prod | wc -l` = 48 total listed (paginated, first page 20), first-page prod 20. Daily `deploy_failed free-per-day` hit once (proc_a9ff65), r38ps1pc1 still succeeded.
- Builds: ~3m each, hobby tier, `npm run build` 87.7kB green
- Why many today: pushes 5dfce8a→8ab2552→64d3962→20fa804 + CLI retries + auto GitHub deploys

## This Month (Aug 2026)
- Deployments total: 48 in `vercel ls` first page + next page (`--next 1787759482675`) → ~60-70 this month (free-tier, $0)
- Bandwidth / Functions / Image / Edge: dashboard https://vercel.com/romelraisul-8939s-projects/hostamar-build/usage — free-tier 100GB bandwidth, 500k edge requests, 100h build minutes — all $0 until quota
- Cost: **$0** (free-tier, no card). `vercel billing` not exposed via CLI; check dashboard Usage tab.

## AI Gateway — $5 Included (no card)
- Vercel AI Gateway GA: single unified API to 100s models, transparent pricing, **$5/mo included credit, no credit card required** (free plan)
- Current usage: **0% used, 100% remaining** ($5.00) — new `lib/ai-gateway.ts` uses `openai/gpt-oss-120b` primary + 3 fallbacks, not yet called (route /api/chat/vercel added today)
- Set budget: Vercel Dashboard → AI Gateway → API Keys → set Budget $5 (prevents loop burn) — docs: https://vercel.com/docs/ai-gateway

## Limit Risk
- 100 deploys/day: hit once today (proc_a9ff65). Resets **02:00 UTC+6**. Remaining today ~88 (if you stopped pushing). Avoid `vercel --prod` loops; prefer `git push` and let GitHub auto-deploy (same quota — don't spam pushes either).
- If stuck Building >10m: cancel in dashboard (does not free count — still counts) — just wait.

## Commands (run again)
- `vercel ls --prod | wc -l` → deployments
- `vercel ls | wc -l` → all envs
- `vercel env ls | grep AI_GATEWAY`
- `curl -s https://hostamar.com/api/binance-price | jq .usdtBdt` → 126.4
