# V21 Audit — sitemap/docs URLs + auto SEO blog + GSC ping (2026-09-01)

## Ground truth vs spec (the spec re-invented existing infra)

| Spec claim | Reality | Action |
|---|---|---|
| "create app/sitemap.ts + app/robots.ts" | BOTH already existed (sitemap.ts with 31 static routes + TV videos; robots.ts with full rules). Verified live: 114 sitemap URLs, robots allow/disallow/sitemap correct | NOT recreated — EXTENDED |
| "create app/blog/[slug]/page.tsx" | Already existed — renders 10 static POSTS from lib/blog.ts with BlogPosting JSON-LD | Extended for generated posts |
| "create ping GSC via google.com/ping" | The repo already has the REAL Google Indexing API integration (lib/google/indexingApi.ts + service account auth, used by /api/seo/submit + seo-sync cron). The legacy ?ping endpoint is deprecated | Reused the real API |
| "/services/{id} × 106 in sitemap" | NO public /services/[id] route exists (live 404). The catalog pages are auth-walled /dashboard/ai-services (robots-disallowed). Adding 106 phantom URLs to the sitemap would be SEO fraud | Skipped honestly — catalog is reachable via /docs + /pricing |
| "need prisma.blogPost" | No BlogPost model existed | ADDED (schema + idempotent ensure-schema DDL) |

## What shipped in V21

1. **Sitemap extended** (app/sitemap.ts): + /docs (0.9), + /docs/bn (0.8), + all 10 blog
   posts. Total now ~125 URLs (31 static + 10 blog + 83 TV + 2 docs).
2. **BlogPost model + DDL**: prisma model + idempotent `CREATE TABLE IF NOT EXISTS` in
   ensure-schema (the repo's runtime-migration pattern — no prisma migrate on prod).
3. **Auto-blog cron** (seo-auto-post): for each service created in the last 24h →
   seo_generate_blog_post (1500-word SEO post via hostamar-1m-a chain) → upsert
   BlogPost row → submit to Google Indexing API (real service-account path) →
   Bing sitemap ping → SeoEvent history. Anonymous cron = free (no billing).
4. **Blog rendering for generated posts**: /blog/[slug] now dynamic + falls back to
   BlogPost rows via server-only lib/blog-generated.ts. CRITICAL LESSON: lib/blog.ts
   is client-bundled (page.client.tsx) — importing prisma there pulled node:dns into
   the client bundle and broke the build. Server-only lookup lives in blog-generated.ts.
5. **New MCP tool seo_ping_gsc** (35 tools total): real Indexing API submission +
   Bing ping, 2cr, honest "GOOGLE_SERVICE_ACCOUNT_JSON missing" note without creds.
6. **seo_generate_blog_post upgraded**: now returns title + slug + metaDescription +
   content; accepts serviceId/language. 10cr real deduction (verified in suite).

## Owner actions (unchanged + GSC specifics)
- GOOGLE_SERVICE_ACCOUNT_JSON: already the pattern the seo-sync cron expects —
  Cloud Console → service account → add its client_email as Owner in Search
  Console property hostamar.com → paste JSON into Vercel env. Until then ping
  results honestly say "missing".
- FACEBOOK_PAGE_ACCESS_TOKEN runbook (docs/v19-audit.md) — FB tools stay honest-no-token.
- Duplicate Vercel project delete + vcp_ rotation (docs/v20-audit.md).

## Verification
tsc 0 · vitest 25/25 · build ✓ (blog pages render: 10 static + dynamic fallback).
Suite v21-80: 70 core + 10 (sitemap URLs/docs/blog, robots, ping tool 2cr, blog
generation 10cr + slug + live /blog/{slug} 200, cron 401, registry 35 tools,
full regression).
