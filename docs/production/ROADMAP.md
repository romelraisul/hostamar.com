# ROADMAP — ordered milestones from FINAL_GOAL.md: launch completion → Agent Cloud → Video OS scale → EU-BD GPU market.

## Order (from ~/hostamar-vision/FINAL_GOAL.md)

### Milestone 0 — launch completion (NOW)

1. **Payments: bKash tokenized checkout** — the only missing revenue path. PENDING; until
   live, no paid claims anywhere in product copy.
2. **GitHub appeal #4892433** — account suspended, push blocked. Until resolved: Vercel
   hostamar-build (which builds from GitHub) is gated; Forgejo (git.hostamar.com) is the
   live host; keep GitLab/Codeberg mirrors current; docs never claim GitHub CI is active.
3. **Bucket public-toggle decision: permanently rejected.** hostamar-prod stays PRIVATE
   with signed-URL delivery forever. This is a closed decision, not an open question.

### Milestone 1 — Hostamar AI Agent Cloud (agent.hostamar.com)

- "CoreWeave + Vercel + n8n in one": persistent container + cron + storage + memory + GPU
  for user agents; pricing from $49/mo is a **target**, not a shipped price.
- Building blocks already in the fleet: coolify-wsl, podman fleet, model gateway
  (api.hostamar.com /v1), nvidia guard 6 models + kilo.ai fallback 384, Infisical.
- Product definition from FINAL_GOAL: agent memory (Chat Memory + Skill + Wiki +
  CodeGraph — the agent never forgets) + open-connector (1400+ APIs). Context Graph is
  the strategic differentiator.

### Milestone 2 — Sovereign Video OS scale (/tv)

- Today: station live (362 published entries, B2 private storage, signed delivery,
  /tv/watch SEO pages with VideoObject JSON-LD).
- Direction from FINAL_GOAL: script-to-monetization closure — OpenCut + HunyuanVideo 1.5 +
  Voicebox + ACE-Step + OpenMontage (12 pipelines); auto YouTube/TikTok + Hostamar CDN +
  bKash paywall (depends on Milestone 0 payments); white-label `opencut-headless render`
  API at $0.10/min (**target**).
- Positioning: "Shopify for AI video creators"; $0 per 60s short with Piper+Pexels
  (FINAL_GOAL claim — verify before quoting externally).

### Milestone 3 — EU-BD GPU spot market (privacy-first)

- Sovereign cloud: data never touches the US; compliance + audit via Infisical +
  OpenObserve (both already in the fleet).
- Market reference prices (FINAL_GOAL, external market data): RTX 4090 spot ~$0.20/h,
  H100 ~$1.5/h. Nothing of this product is built.

## Lifetime framing (FINAL_GOAL)

Y1–2: MVP all 3, ~$3M ARR target. Y3–5: sale/raise. Y5–15: lease data-center capacity,
sovereign cloud — 0.1% of the $4.2T AI market as the long-horizon goal.

## Standing orders that constrain every milestone

- Do not break the running foundation (containers, gateway, uploader chain).
- No money, free tiers only; no fake work — real tool output or honest blocker.
- New services reuse hostamar-postgres + redis-foundation; secrets → Infisical; logs →
  OpenObserve `hostamar_logs`.
