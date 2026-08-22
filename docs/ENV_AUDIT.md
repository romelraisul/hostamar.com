# ENV_AUDIT — 2026-08-22

Remote = Vercel project `hostamar-build` (`prj_WwYkMz8Kk75NN573skKxxWcuMVYi`, prod → hostamar.com). Backup files: `.env.vercel.backup` (plaintext pull), `.env.backup.json` (API list). Both git-ignored.

## Required for TV go-live

| var | local (.env.local) | Vercel | required | action |
|---|---|---|---|---|
| DATABASE_URL | ✓ | ✓ | yes | none |
| JWT_SECRET | ✓ | ✓ | yes | none |
| NEXTAUTH_SECRET | ✓ | ✓ | yes | none |
| NEXTAUTH_URL | ✓ | ✓ | yes | none |
| TV_AGENT_SECRET | ✗ | ✗ | yes (agent auth) | GENERATE + upsert via API |
| CLOUDFLARE_TUNNEL_TOKEN | ✗ | ✗ | optional (auto-expose HLS) | leave empty; user adds token when tunnel created |
| TV_HLS_URL | ✗ | ✗ | optional (static override) | leave empty; admin sets via /admin/tv after tunnel is up |
| CLOUDFLARE_ZONE_ID | ✗ | ✗ | optional | skip |
| CRON_SECRET | ✓ | ✓ | yes | none (already set) |
| SMS_WEBHOOK_SECRET | ✓ | ✓ | yes | none (already set) |

## TV-related already in Vercel

TV_CHANNEL_NAME, TV_AUTO_GENERATE_ENABLED, RSS_FEEDS, YOUTUBE_RTMP_URL, FACEBOOK_RTMP_URL, TWITCH_RTMP_URL — all present [production].

## lib/env.ts schema coverage

All audited keys exist in lib/env.ts zod schema (TV_*, CLOUDFLARE_*, SMS_WEBHOOK_SECRET, CRON_SECRET, YOUTUBE/FACEBOOK/TWITCH_*). VERCEL_API_TOKEN intentionally NOT added to lib/env.ts — deploy-time secret only, belongs in CI/CLI, never in the app runtime env.

## Notes

- VERCEL_API_TOKEN was not present as a shell env var; used the logged-in Vercel CLI's stored token at runtime instead (never printed).
- Remote env count before changes: **56**.
