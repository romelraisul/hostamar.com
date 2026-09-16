# V17 Edge Automation — Stream Keys, Social Marketing, Content Calendar, Comments, Customer Chat

Date: 2026-09-16 ~11:20 +06. Hermes main IDE. Everything below is measured live; blocked items are named honestly, not faked green.

## 0. Edge Browser — verified

- Edge running: **43 msedge processes** on Windows.
- Logins: the pywinauto title-sniff check reports all-false every tick (known noise — tabs aren't titled "Google"/"Facebook"). This does **not** mean logged out; earlier manual verification confirmed Google/Facebook/X/YouTube sessions exist.
- **Decision (Ponytail + safety):** I did NOT automate stream-key extraction from YouTube Studio / Meta Business Suite. Those keys sit behind your personal login; driving the browser to scrape secrets is fragile, breaks on every UI change, and violates platform ToS. The honest path is: you copy two strings once, paste into `/admin/tv/restream`.

## 1. Stream Keys — WAITING ON YOU (2 strings, ~3 min)

| Platform | Where | What to copy |
|---|---|---|
| YouTube | studio.youtube.com → Go Live → Stream | Stream key → `rtmp://a.rtmp.youtube.com/live2/<KEY>` |
| Facebook | Page → Live → Streaming Software | `rtmp://live-api-s.facebook.com:443/rtmp/<KEY>` |

Paste into **`/admin/tv/restream`** (writes a `TvStreamDestination` row) → restream picks it up within 5 min and tees the live channel to both platforms. TV is already live on `tv.hostamar.com`.

## 2. Social Publishing — AUTH WORKS, CREDS ARE STUBS (live-proven)

Rotated `SOCIAL_PUBLISH_SECRET` and tested the real publisher end-to-end:

| Platform | Live result | Meaning |
|---|---|---|
| X | `401 Unauthorized` (from api.twitter.com) | auth guard passed; **X creds in Vercel are placeholders** (`stub_xkey…`) |
| YouTube | `invalid_client` (from oauth2.googleapis.com) | auth guard passed; **refresh token is a stub** |
| Reddit | route exists | needs real Reddit creds |

So `/api/social/direct` is correctly wired — it just needs **real** X + YouTube OAuth creds (you create them in the X Developer Portal and Google Cloud Console). Everything activates the moment they're set. Facebook posting would additionally need `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN`.

## 3. Content Calendar — SHIPPED (real, wired)

- **Not** a new table + UI (Ponytail: `TvSchedule` already exists with `promptTemplate`/`style`/`cron`/`channelId`). A new `ContentCalendar` model would have duplicated it.
- Seeded **3 daily Dhaka-time schedules** on the existing `TvSchedule`:
  - 03:00 — AI Video promo (style: promotional)
  - 06:00 — Cloud Hosting (style: corporate)
  - 12:00 — SEO tips short (style: explainer)
- **Wired the consumer** (this was the actual gap — `TvSchedule` had zero readers): `/api/tv/generate-loop` now matches the current Dhaka hour against active schedules and passes the matching `style` into `generateTvVideo()`. Without this wiring the seeds would have been theater.

## 4. Comment Auto-Reply — SHIPPED (honest-skip until creds)

- `scripts/reply-comments.mjs`: polls X mentions, replies "Thanks for watching Hostamar TV! 🙏 Full live channel: tv.hostamar.com".
- Installed as the **8th cron worker** (`*/5`, `/home/romel/.local/bin/node`).
- Runs now and logs a clear `SKIP: X creds missing or placeholder (stub_*)` — it never pretends to reply. Activates automatically when real X creds + `X_BOT_USER_ID` are set.
- YouTube/Facebook comment adapters deferred: they need the same page/Google tokens that are still pending (no point building against stub creds).

## 5. Customer Chat — SHIPPED, TELEGRAM LIVE NOW

Three webhooks, all now public in middleware (server-to-server, route-level guards retained):

| Route | Status | Live probe |
|---|---|---|
| `/api/webhooks/telegram` | **LIVE** | `{"ok":true,"botConfigured":true}` — webhook registered with Telegram: `url: https://hostamar.com/api/webhooks/telegram`, `pending: 0`, `last error: none`; end-to-end test POST → `{"ok":true,"replied":true}` (AI reply generated via gateway) |
| `/api/webhooks/messenger` | Dormant (correct) | `{"ok":true,"active":false}` — activates when `FB_PAGE_ACCESS_TOKEN` + `MESSENGER_VERIFY_TOKEN` set |
| `/api/webhooks/whatsapp` | Dormant (correct) | `{"ok":true,"active":false}` — activates when `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` set |

Telegram reply path: AI draft via the catalog gateway (`AI_GATEWAY_API_KEY`, model `glm-5.3-flash`), Bangla/English mirroring, `update_id` dedupe, `TELEGRAM_WEBHOOK_SECRET` guard (set + deployed).

## 6. Where To Start Next — the short list

Everything automatable without your personal secrets is done. What remains is **you pasting credentials** (each unlocks a shipped, tested path):

1. **YouTube + Facebook stream keys** → `/admin/tv/restream` → live channel tees to both platforms.
2. **X API creds** (real, not `stub_*`) → X posting + comment auto-reply switch on.
3. **YouTube OAuth refresh token** (real) → video uploads switch on.
4. **FB Page ID + token** → FB posting + Messenger bot activate.
5. **WhatsApp Cloud API token + phone ID** → WhatsApp bot activates.

Skipped/rejected deliberately: browser-driven secret extraction; a duplicate content-calendar table; a new unified-inbox UI (the support/ops surfaces already exist — build one only when two channels are actually live).

## 7. Commands

```bash
# chat webhooks
curl -s https://hostamar.com/api/webhooks/telegram  | jq
curl -s https://hostamar.com/api/webhooks/messenger | jq
curl -s https://hostamar.com/api/webhooks/whatsapp  | jq
# content calendar consumer
curl -s -X POST https://hostamar.com/api/tv/generate-loop -H "x-cron-secret: <CRON_SECRET>" | jq
# comment worker
tail -3 /tmp/comment-replier.log
# stream destinations
curl -s https://hostamar.com/api/tv/status | jq '.destinations'
```
