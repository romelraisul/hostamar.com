# Team Training & Change Management — ADKAR (Prosci), People-First

63% of AI adoption failures are human-factor. Top challenges: training lack (38%), integration (16%), leadership alignment (43%), data quality (10%), trust/security concerns. Counter each explicitly:

## ADKAR for Hostamar (founder + future support staff)
| Stage | Action | Owner |
|---|---|---|
| Awareness | One-pager: "Hostamar AI handles drafts/support/payments; you approve." Read docs/governance.md | Founder |
| Desire | Show 3 wins: auto-approved bKash payment, 90s video draft, 24/7 support replies | Founder |
| Knowledge | Runbook: /dashboard/chat usage, /admin/payments approval flow, TV /admin/tv controls; DR runbook in lib/disaster-recovery.ts | Founder → staff |
| Ability | Dry-run drills: approve a payment, answer a support chat, roll back a deploy (dashboard) | Founder |
| Reinforcement | Weekly review ritual: daily-health cron output + /dashboard/analytics | Founder |

## Role-specific minimums
- **Support staff**: support-agent handoff rules (payment → payment agent; else LLM), escalation to human for >৳2999 refunds.
- **Content reviewer**: Tier-2 human edit of AI drafts (content-pipeline) before publish — never blind-publish.
- **Payments admin**: verify TrxID against bKash app statement; auto-approve only fires on exact plan amounts.

## AI literacy principles
- Every AI output that reaches a customer is labeled AI-generated where practical.
- No PII into third-party LLMs beyond what the task needs (kilocode sees chat text only).
- Human-in-the-loop gates: payments, refunds, publish.

## Training material inventory (all in repo, zero cost)
- docs/governance.md — compliance
- docs/cost-roi.md — unit economics
- docs/roadmap.md — what ships next
- audit/executive-summary.md — risk posture
- lib/agents/orchestrator.ts — agent behaviors & handoffs (read the code)
