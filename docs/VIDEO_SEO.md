# Hostamar TV — Video SEO (every video SEOs itself)

Every free CC video published to Hostamar TV automatically gets its own
Google-indexable page at `/tv/watch/{slug}` with VideoObject schema, OG image,
Bangla transcript, and sitemap entry. No manual SEO work — the pipeline does it.

## Pipeline

```
hunter_fixed.ts          → FreeVideoSource row (CC video, 1 per product)
create_from_free.ts      → download → rafan Bangla → gender voice → watermark → publish pos1
  └─ AUTO-SEO (step 7)   → spawns seo_generate.py --source-id <id> (detached)
seo_generate.py          → rafan SEO JSON → validate → OG image → TvVideoSeo upsert
tv-viral.service (1h)    → seo_generate.py --missing (catches anything missed)
/tv/watch/[slug] (ISR 1h)→ page + sitemap auto-include new rows, no rebuild needed
```

## Data model — `TvVideoSeo` (main Neon DB)

| field | purpose |
|---|---|
| videoSourceId | FK → FreeVideoSource.id (unique) |
| slug | kebab-case English, e.g. `ai-video-generator-bangla-tutorial-2026` |
| titleBn | SEO title ~60 chars: product keyword + Bangla + "Hostamar TV" |
| metaDescription | ~155 chars Bangla with CTA (এখনই দেখুন / ফ্রি শুরু করুন), bKash, Daraz |
| keywords | 6-8 mixed Bangla + English |
| transcriptBn | 200-300 word Bangla transcript for keyword indexing |
| schemaJson | VideoObject schema.org payload |
| ogImage | `/og/tv/{slug}.jpg` — 1200x630, watermark + titleBn + product tag |
| canonicalUrl | `https://hostamar.com/tv/watch/{slug}` |

Table is created two ways (belt + braces):
1. `lib/ensure-schema.ts` — lazy DDL on first API use (Vercel runtime pattern)
2. `prisma/schema.prisma` model — for Prisma client typing

## SEO generation — `scripts/tv/seo_generate.py`

```bash
python3 scripts/tv/seo_generate.py --all            # regenerate everything
python3 scripts/tv/seo_generate.py --source-id ID   # one video (auto-SEO hook)
python3 scripts/tv/seo_generate.py --product Video  # one product
python3 scripts/tv/seo_generate.py --missing        # only rows without SEO (loop mode)
```

- Calls **rafan** (in-house LLM, gateway :11442) with a concise fill-in prompt.
- rafan is a REASONING model: it thinks first, JSON comes last. The script
  extracts the LAST JSON object containing the wanted key via the stdlib
  decoder (`extract_json(content, want_key=...)`). `timeout=900s`.
- rafan DEGENERATES into repetition loops on long-form generation (27B Q1_0),
  so the transcript is NOT rafan-generated. `build_transcript()` builds a
  deterministic 150-200 word Bangla transcript from the video's REAL
  scriptBn/hook + product benefit sentences. Reliable + instant.
- Validation: Bangla letters present, title 30-90 chars, slug kebab-case,
  keywords ≥6. Retries 3× with rising temperature, then falls back to a
  deterministic Bangla template (logged as FALLBACK).
- Neon drops idle SSL connections during the ~5-min rafan call, so the upsert
  opens a FRESH connection (`upsert_seo` ignores the passed conn).
- OG image: PIL 1200x630 — video frame (blurred) or gradient, green product
  tag, HOSTAMAR.COM/TV watermark, titleBn in NotoSansBengali-Bold, yellow hook,
  green bottom bar. Saved to `public/og/tv/{slug}.jpg`.

## Watch page — `app/tv/watch/[slug]/page.tsx`

Server component (Googlebot-friendly), `revalidate = 3600` (ISR).

- `generateMetadata`: title/description/keywords/canonical/OG(video.other,
  bn_BD, 1200x630 image)/twitter summary_large_image
- VideoObject JSON-LD from `schemaJson` (contentUrl = direct MP4 on
  tv.hostamar.com, embedUrl = canonical page, duration from ffprobe,
  inLanguage bn-BD)
- Player (`player.tsx`): direct MP4 first → HLS live fallback → VP9 variant
  for codec-free Chromium (same contract as /tv)
- Transcript collapsible, keyword tags, 3 related videos, CTA to
  `/dashboard/video/create?template={slug}`, IPTV link

## Sitemap — `app/sitemap.ts`

Async + `revalidate = 3600`: static routes + every `TvVideoSeo` row as
`/tv/watch/{slug}` with `changeFrequency: 'daily'`, `priority: 0.8`.
New videos appear within 1h without a rebuild.

## Video delivery — nginx

`docker/tv-station/nginx.conf` (hostamar-tv-rtmp, tv.hostamar.com :8080):

```nginx
location /videos/ {
    alias /videos/;               # container mount → docker/tv-station/videos
    types { video/mp4 mp4; }
    add_header Cache-Control "public, max-age=3600";
    add_header Access-Control-Allow-Origin * always;
}
```

After editing: `podman exec hostamar-tv-rtmp nginx -t -c /etc/nginx/nginx-tv.conf && podman exec hostamar-tv-rtmp nginx -s reload -c /etc/nginx/nginx-tv.conf`

## Hero deep-link

`/api/tv/now-playing` returns `slug` (resolved from the on-air playlist file's
FreeVideoSource id → TvVideoSeo). `TvHero` links the LIVE button + now-playing
bar to `/tv/watch/{slug}` when the on-air video has an SEO page.

## Verify

```bash
curl https://hostamar.com/tv/watch/<slug> -s | grep -oE "<title>[^<]*</title>"
curl https://hostamar.com/sitemap.xml | grep tv/watch
curl -s -o /dev/null -w "%{http_code}\n" https://tv.hostamar.com/videos/viral/<file>.mp4
```

Schema validation: https://validator.schema.org/ with the page URL.

## Gotchas

- rafan Bangla has spelling quirks (টূটলিওরাল etc.) — validation only checks
  Bangla letters are present, not spelling. Acceptable for now.
- Vercel build sandbox can't reach Neon: `generateStaticParams` degrades to []
  and pages render on-demand via ISR. This is expected, not an error.
- Slug collisions across sources get a `-{id4}` suffix automatically.
- OG images live in `public/og/tv/` — commit them or they 404 on Vercel.
