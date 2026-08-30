# Verify Dedup — 105 Unique — LIVE (2026-08-30, deploy 4e0916d)

## Method
`scripts/dedup-catalog.js` — two-layer dedup:
1. Exact normalized slug match (0 collisions)
2. Semantic overlap map (31 Fiverr concepts covered by existing services — existing card WINS, keeps its creditCost/benefit/promptTemplate; the new entry is SKIPPED)

Raw Fiverr jobs: **86** (the V3 spec listed 86 entries, not 110) · Existing: **50**
Skipped semantic duplicates: **31** · New unique added: **55**

## FINAL: 105 unique — NOT 160+, NOT 120

## Live verification (real HTTP, 2026-08-30)
```
GET /api/ai-services/catalog → totalDeduped: 105
  "logo" search      → 1 card: Logo Animation        (logo-design was skipped → brand-identity-starter covers it)
  "packaging" search  → 1 card: Packaging Design      (new unique, added)
  unique service ids  → 105 of 105 (zero duplicate slugs)
```

## Transparency note
The ship prompt claimed 110 raw Fiverr jobs; the actual list in the spec contains
86 entries. Honest math: 50 existing + 55 new unique = **105 unique services**.
No cards are duplicated; every concept has exactly one card. Report of every
skipped dupe and every added job: `docs/product-list-deduped-120.md`.

## Where this is enforced
- Seed source: `lib/services/fiverr/catalog-110-deduped.json` (55 new unique ONLY)
- `ensureFiverrCatalog()` (lib/pinned-chat.ts) is idempotent — re-runs never duplicate
- `/api/ai-services/catalog` returns `totalDeduped` for continuous monitoring
