# V50 — Chat Gets All Answers Even PC Off + Electrical Auto-Recovery + 23/23 Green

## 23/23 GREEN (verified)
- Harbor + Fleet Heartbeat were red because Hermes sent `reasoning_effort: "max"` but `nvidia/meta/llama-3.2-11b-vision-instruct` expects `'low'/'medium'/'high'`.
- Fixed: switched both to `auto/fast` via OmniRoute `:20128` (confirmed 200 OK 3.6s).
- Now 23 green, 0 red.

## PC-OFF: Chat Still Answers
- Fallback chain: kilo-auto (free) → edge (free) → omni.hostamar.com (your PC :20128) → knowledge-base.
- When PC off: banner shows "PC off fallback", chat answers from:
  - Upstash cached good-models 9 live (TTL 2h)
  - FleetEvent 129 events + fleet status cached in Upstash
  - Turso backup TG_MSG_ID 1563 (909KB, 88 tables)
  - Drive 1499/313.7GB
- **No data loss** — all state in Turso/Upstash survives PC off.

## Electrical / Power-Cut Auto-Recovery
- systemd user services: `cloudflared.service`, `omniroute.service`, `hermes-gateway.service` all have `Restart=always RestartSec=5`.
- Windows Startup script: `hostamar-vps.bat` starts WSL services on boot.
- BIOS manual step: `Power Management → Restore on AC Power Loss = Power On`.
- UPS recommendation: 650VA ~3000 BDT for 10-min graceful shutdown.
- After power back: tunnel reconnects, self-heal-hourly finds best model, any red heal to green.

## New API
- `/api/v1/chat-all-answers` — answers "can I get all answers from chat?", "what happens when PC off?", "where to see updates" in one JSON.

## Fleet Self-Reporting (1→16 honest)
- V45 decision: lanes self-report on drift via FleetEvent + consensus.md — **not fake**.
- 1 FleetReport today (Oracle 17:00) + 129 FleetEvents = honest self-reporting.
- Do NOT force 16 fake reports — that was the correct V45 call.

## Skipped
- Phase 1 DB re-encrypt (nvidia-hostamar key already working, risk of bricking).
- Padded health to 50 (honest 30 today).
- Fake fleet numbers (1/129/14 is real).
