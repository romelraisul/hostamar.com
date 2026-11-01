# MCP_CONNECTION — hostamar.com

## Context

Model Context Protocol servers connect AI agents to local tools: browser automation, database queries, filesystem access, and Cloudflare Wrangler. Configs live in `.cursor/mcp.json`, `.hermes/mcp.json`, and `.opencode/mcp.json`.

**P4 Status: CLOSED** — `/models.json` 404 fixed (was @libsql/isomorphic-ws esbuild bug).
**P5 Status: IN PROGRESS** — f005 CDN Worker (B2 version) deployed, routes pending Zone permission.

## Task

Document all MCP configurations, connection strings (redacted), and troubleshooting steps.

## Includes

### MCP Server Configurations

**.cursor/mcp.json**
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    },
    "db": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "[REDACTED - Neon over 443]" }
    },
    "fs": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/home/romel/hostamar.com"]
    },
    "wrangler": {
      "command": "npx",
      "args": ["wrangler", "mcp"],
      "env": { "CLOUDFLARE_API_TOKEN": "[REDACTED]" }
    }
  }
}
```

**.hermes/mcp.json** (Hermes agent)
```json
{
  "mcpServers": {
    "browser": { "command": "browser_exec" },
    "fs": { "command": "terminal", "args": ["read/write files"] },
    "db": { "command": "session_search" }
  }
}
```

**.opencode/mcp.json**
Same as `.cursor/mcp.json` — Opencode shares the same server set.

### Connection Details

| Server | Transport | Target | Auth |
|--------|-----------|--------|------|
| Browser | stdio | Playwright Chromium | None (local) |
| DB (Neon) | stdio | Neon serverless over 443 | DATABASE_URL [REDACTED] |
| DB (local PG) | stdio | WSL Podman Postgres:5432 | localhost |
| FS | stdio | `/home/romel/hostamar.com` | None (local) |
| Wrangler | stdio | Cloudflare API | CLOUDFLARE_API_TOKEN [REDACTED] |

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Browser MCP: page not found | Stale tab | Call `ensure_real_tab()` then re-navigate |
| DB MCP: password auth failed | Neon free-tier suspended | Check Neon dashboard, reconnect over 443 |
| DB MCP: port 5432 blocked | DPI blocking | Use `@neondatabase/serverless` over HTTPS 443 |
| Wrangler MCP: 403 unauthorized | Token expired | Re-source `/home/romel/automation/infisical.env` |
| FS MCP: permission denied | WSL path permission | Check file ownership, `chown romel:romel` |

### Infisical Integration

- All MCP server credentials sourced from `/home/romel/automation/infisical.env`
- `infisical export --env-file=.env.b2 --projectId=hostamar --env=prod` for local scripts
- Never commit MCP configs with real tokens — use `[REDACTED]` placeholders.

### B2 Integration (P5)

- B2 credentials: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` from Infisical
- B2 bucket: `hostamar-prod` (S3-compatible endpoint: `s3.us-east-005.backblazeb2.com`)
- B2 operations: `b2` CLI, `sync-manifest-to-b2.mjs` (uses @aws-sdk/client-s3)

## Rules

- MCP configs never committed with real tokens — use `[REDACTED]` placeholders.
- Browser MCP never guesses credentials; use `browser_vault` on login walls.
- DB MCP queries read-only unless explicitly authorized for writes.
- **B2 not R2**: All manifests and video assets on Backblaze B2 (f005/us-east-005), NOT Cloudflare R2
- **Infisical secrets**: ALL secrets in `/home/romel/automation/infisical.env` — NEVER commit

## Output

This document. Reference for MCP debugging.