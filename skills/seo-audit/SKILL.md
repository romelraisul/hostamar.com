---
name: seo-audit
description: Use this skill to audit a website or generated page for SEO health, compute a score with codeact, and emit a Bengali-first report to working/reports/.
---

# SEO Audit Skill

Audits on-page SEO and produces a numeric score plus a Bengali-first action plan.

## Steps
1. Gather target URL or read the file via `file_access_read_file`.
2. Extract signals: title length, h1/h2 count, image alts, keyword density,
   meta description, internal links, mobile readability.
3. Run `codeact_run` with a JS/Python function that returns:
   `{ score: 0-100, issues: [...], passed: [...] }`.
4. Save the report to `working/reports/seo-<slug>.md` (approval-gated save).
5. Optionally tidy with `run_shell` (e.g. `ls -la`, never `rm -rf`).

## Scoring heuristic (reference)
- title 30-60 chars: +15
- single h1: +10
- >=3 h2: +10
- meta description 70-160 chars: +15
- images with alt: +15
- keyword density 1-3%: +20
- internal links >=3: +15

## Rules
- Compute, never guess. The score MUST come from `codeact_run`.
- Mask any customer domain owner email in the report.
