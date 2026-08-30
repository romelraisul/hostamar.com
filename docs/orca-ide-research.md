# Chat OS — Orca IDE (v10, 2026-08-30)

## What shipped
`/dashboard/admin/chat-os` — Hostamar Chat OS, Orca-IDE style, full functional:

- **Top bar**: Projects dropdown · active-session indicator · git branch ·
  bKash 01822417463 · real-time credit meter (6000→decreases) · 120-model
  searchable selector · MCP indicator · WebMCP indicator.
- **Left — File Explorer**: real per-user virtual FS on B2
  (`chatos/{userId}/files/*`): create/read/save/delete, dirty-state save
  (1cr per save). Viewing free.
- **Center — Chat OS**: Claude-first chat with **/tools //resources //prompts**
  commands listing the live MCP registry; model selector; kilocode chain
  (survives computer off); 1cr per message + 1cr/1000 tokens usage.
- **Right — Preview + Design Mode**: built-in browser (sandboxed iframe,
  editable srcDoc preview of your app); **Design Mode toggle → click any
  element → it drops into the chat** with an AI suggestion (1cr per click).
  Preview session 5cr/hr.
- **Bottom — 4 tabs**:
  - **Terminal**: real command interpreter over the B2 virtual FS + virtual
    git (`ls`, `cat`, `rm`, `git status/diff/log/commit`, `help`) —
    1cr per command. NOTE (honest): serverless has no host shell; this is a
    curated interpreter operating on real files — no `npm run dev` process.
  - **Source Control**: virtual git object store (per-user git.json) with
    real snapshot diffs and commits — commit 1cr.
  - **MCP Servers**: live registry grid — click a tool to invoke it through
    the chat (per-tool cost 1-5cr; viewing free).
  - **Plugins + TaskMaster**: plugin list (install 5cr) + task list
    (create 2cr), persisted per user.

## Billing (STRICT — nothing free after the 6000 signup grant)
| Action | Cost |
|---|---|
| chat message | 1cr + 1cr/1000 tokens |
| terminal command | 1cr |
| file save | 1cr |
| git commit | 1cr |
| design-mode click | 1cr |
| plugin install | 5cr |
| task create | 2cr |
| preview session | 5cr/hr |
| MCP tool call | tool cost (1-5cr / service cost) |
| file_list/read, git_status/diff, mcp_list, plugin_list, task_list | free viewing |

Insufficient → 402 + bKash + plans (Starter 599/Pro 1299/Business 2999 → 6000cr).
Every debit writes a raw-SQL CreditTransaction audit row.

## API
`GET /api/admin/chat-os` — action+cost manifest.
`POST /api/admin/chat-os` — `{action, args}`; actions: chat, terminal,
file_list, file_read, file_save, git_status, git_diff, git_commit, mcp_list,
mcp_call, design_click, plugin_list, plugin_install, task_list, task_create,
preview_session. Rate limited 60/min/IP.

## Honesty notes
- The terminal is a **curated interpreter on real storage**, not a host PTY —
  Vercel serverless cannot spawn shells. `git` is a real object-store model
  (true snapshots + true diffs) over the user's B2 files, not libgit2.
- The MCP panel calls the SAME billable registry as /api/mcp — no duplicated
  billing logic.
- Preview runs sandboxed (`allow-scripts` only) — Design Mode clicks are
  captured host-side, so they cannot touch the dashboard itself.
