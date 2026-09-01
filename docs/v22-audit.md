# V22 Audit — top10 auto-blog + GSC/FB honest-state wiring (2026-09-01)

## Ground truth vs spec (again, the spec's ids were 90% phantom)

The spec's "top 10 services" list (voiceover-bangla, video-editing, content-writing,
social-media-post, website-development, seo-optimization, graphic-design,
translation-bangla-english, digital-marketing) — **only logo-design exists in the
real 106 catalog**. Mapped the intent to REAL catalog services (voiceover,
logo-design, product-demo, content-repurpose, social-automation, website-to-app,
seo-audit, logo-animation, translation, chatbot-script) with REAL prices/discounts
from the live catalog API. Recorded in the TOP10_SERVICES constant in the cron.

## What shipped in V22

1. **TOP-10 AUTO-BLOG (round-robin)** in the seo-auto-post cron:
   - Up to 2 missing posts per run (60s serverless budget fits 2 × 15-25s LLM calls;
     10 at once would 504 — same class of bug as the V17 activation 504)
   - Idempotent: skips services that already have a BlogPost row (`svc:{id}` set)
   - Converges: 5 daily runs → all 10 posts; or trigger repeatedly with
     `?top10=true` + CRON_SECRET
   - Generated posts go through the SAME BlogPost table + /blog/{slug} dynamic
     render + sitemap + Google Indexing ping as V21
2. **Blog tool hardened**: 20s race timeout on the LLM call (empty-text fail path)
   so one hung slot can't kill the cron's budget.
3. **Suite v22-90**: 80 core + 10 grounded (GSC honest/Bing, FB honest 0cr-or-LIVE
   permalink branch, IG honest, cron fail-closed 401 + top10 field, sitemap growth,
   /blog 200, 35 MCP tools, money/security/docs regression).

## GSC + FB "wire live" — OWNER-ONLY actions (not fabricatable from this session)
Neither GOOGLE_SERVICE_ACCOUNT_JSON nor FACEBOOK_PAGE_ACCESS_TOKEN exists in any
env file. Tests 81/82/83 handle BOTH states honestly:
- No creds → assert the honest error note (GOOGLE_SERVICE_ACCOUNT_JSON missing /
  FACEBOOK_PAGE_ACCESS_TOKEN required) + Bing attempted + 0cr charged on failed FB call.
- Creds added → the same tests auto-branch to assert live Indexing submissions and
  real postId/permalink. No fake post, ever.
Runbooks (unchanged): GSC service account — docs/v21-audit.md; FB Page token —
docs/v19-audit.md; Vercel dup delete + vcp_ rotation — docs/v20-audit.md.

## After the owner adds the two tokens
- GSC: re-run suite → test 81 flips to "GSC LIVE: Indexing API submission ok".
- FB: re-run → test 82 flips to "FB LIVE post: postId=... permalink=..." (2cr).
- Cron: each daily run now posts to the FB Page via social_auto_post_new_service.
