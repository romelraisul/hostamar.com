# TV assets — git & B2 layout (Phase 1.3)

The heavy TV media never goes into git. Layout:

| Path | In git? | Served from |
|---|---|---|
| `public/tv/*.mp4` | YES (294 files, largest 21MB) | Worker static assets — 25MiB per-file cap, all under it |
| `public/og/tv/*.jpg` | YES (thumbnails, ~100KB each) | Worker static assets |
| `app/tv/loop.mp4/loop.mp4` | NO — ignored via `.gitignore` `*.mp4` (194,649,042 bytes ≈ 186MB) | NOT served from git — streamed by `app/tv/loop.mp4/route.ts` |

## The big loop video

`app/tv/loop.mp4/loop.mp4` is a local working copy only. The route
`app/tv/loop.mp4/route.ts` streams the object `tv/loop.mp4` from the
**Backblaze B2 bucket `hostamar-prod`** (B2 keys in `.env.local`, `B2_BUCKET`)
with `cache-control: public, max-age=3600` + range support, so the video is
never bundled into the Worker.

- Page src points at the route (`/tv/loop.mp4`), which proxies B2 — no direct
  B2 URLs in page markup (keeps the bucket private).
- Verified 2026-10-22: live `https://hostamar.com/tv/loop.mp4` → HTTP 200,
  `content-length: 194649042` — byte-identical to the local working copy, so
  the B2 object is current; no re-upload needed.

## Refresh procedure (new loop render)

1. Replace `app/tv/loop.mp4/loop.mp4` locally.
2. Upload to B2 key `tv/loop.mp4` (bucket `hostamar-prod`) — B2 native upload
   or S3 SigV4 PUT; `.env.local` has the keys.
3. Leave the file untracked — `git status` must never show the mp4. If a new
   mp4 ever lands in `public/tv/`, it must stay ≤25MiB (Worker static asset
   cap) or it breaks the Worker upload.

## Do NOT

- Do not `git add -f` any `*.mp4`.
- Do not point page markup at a public B2 URL — keep streaming through the route.
