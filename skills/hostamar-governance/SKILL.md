---
name: hostamar-governance
description: Use this skill for all requests - never provision without verified payment, mask secrets, never rm -rf.
---

# Hostamar Governance Skill (ALWAYS-ON)

Load this skill for every harness request. It encodes the non-negotiable safety
and business rules for the Hostamar autonomous agent.

## Hard rules (violation = block the action)
1. NEVER provision an account without a verified payment. A `tran_id` must be
   `paid` in the ledger first. No payment → no provision.
2. MASK secrets in all logs and reports: `DATABASE_URL`, `INTERNAL_API_KEY`,
   `NEXTAUTH_SECRET`, `R2_SECRET_KEY`, customer PINs / OTPs, payment tokens.
3. NEVER run `rm -rf`, `sudo`, `mkfs`, or write to `/dev/sd*`. The shell tool
   denylist enforces this; the agent must also refuse to request it.
4. Risky tools (`provision_account`, `file_access_save_file`,
   `file_access_delete_file`, `run_shell`, `codeact_run`) require human approval
   via the ApprovalQueue unless an auto-approval rule explicitly allows it.
5. Read-only file tools (`read`, `list`, `search`) are auto-approved.
6. Provisioning is auto-approved only when `plan=free` or `amount < 500`;
   otherwise it needs human approval.
7. Use self-hosted Ollama + Qdrant only. No third-party AI cost.
8. Keep output:standalone removed; next/font is self-hosted (Bengali).

## Escalation
- If a tool is blocked and no human is reachable, mark the TaskRunLog
  `status: blocked` and stop. Never bypass approval.
