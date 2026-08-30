# Verify Dedup — 106 Unique — LIVE (V14, 2026-08-30, deploy 9379e1f+)

## Method
`scripts/dedup-catalog.js` — two-layer dedup + curated pricing merge:
1. Exact normalized-slug match
2. Semantic overlap map — V13 UPDATE: `logo-design` REMOVED from the skip map
   (Logo Design / Brand Identity Starter / Logo Animation are 3 DISTINCT
   products, not dupes) — 30 semantic dupes remain skipped
3. Curated research-anchored pricing merged on every run (idempotent):
   Fiverr ranges corrected to research (voiceover $20-60, logo $20-100, …),
   tiers 400/900/1800 etc, discount = Fiverr BASIC (lower-bound × 120TK) math.

Raw Fiverr jobs: 86 · Existing catalog: 50 · New unique added: 56

## FINAL: 106 unique — NOT 160+, NOT 105

## Live verification (real HTTP, 2026-08-30)
```
GET /api/ai-services/catalog → totalDeduped: 106, duplicate IDs: 0
  search=logo-design → 1 result (Logo Design, hyphen/space normalized)
  logo-related distinct: Logo Design (400/900/1800) · Logo Animation (1440 tier-scaled) ·
                        Brand Identity Starter (tier backfilled from its own creditCost)
  voiceover: tiers {500,1200,2500} · discount 79% (Fiverr basic $20=৳2400 vs 500cr)
  logo-design: tiers {400,900,1800} · discount 83%
```

## Tier discount math (Fiverr basic/standard/premium BDT vs our tiers)
voiceover: 79% basic (2400 vs 500) · 83% standard (7200 vs 1200) · 86% premium (18000 vs 2500)

## Where this is enforced
- Seed + curated merge: `lib/services/fiverr/catalog-110-deduped.json` (56 unique)
- Self-heal on every catalog call: `ensureFiverrCatalog()` + V14 existing-50 tier backfill
- Catalog API: `/api/ai-services/catalog` — 106, 0 dupes, hyphen-normalized search
