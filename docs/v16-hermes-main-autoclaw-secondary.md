# V16 Roles — Hermes Main, AutoClaw Secondary

Decided 2026-09-15, ratified by live audit.

- **Hermes = main IDE**: all autonomous work runs through Hermes (gateway `hermes_cli gateway run`), the WSL cron employee fleet, the Cloudflare-Worker job queue, and systemd TV units. 49-employee registry at `~/.hermes/employees/fleet.json` (registry — runtime workers are the 7 cron/queue/systemd scripts).
- **AutoClaw (Zhipu desktop, `C:\Users\User\.openclaw-autoclaw\`) = SECONDARY designer ONLY.** Its heartbeat stays DISABLED (gateway `[heartbeat] disabled`, `every:'0s'`) to avoid double-running autonomous jobs against the same repos. Use it interactively for design tasks only.
- AutoClaw delivered (Sep 14–15): api/storage endpoint repair, lead-capture fix, ops-center backend, 2 outbound sales pitches, bespoke dashboard/admin redesign (a829b84). Reports in `workspace\delivery\`.

Rule of thumb: anything that must run 24/7 belongs to Hermes (cron/systemd/queue). AutoClaw is a tool you open when you want its built-in design/office skills.
