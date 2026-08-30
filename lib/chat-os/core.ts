/**
 * Chat OS core (Orca-style) — every action bills credits BEFORE execution.
 * Actions: chat, terminal, file_list, file_read, file_save, git_status,
 * git_diff, git_commit, mcp_call, design_click, plugin_install, task_create,
 * preview_session. Zero cost: serverless-safe (no real shell — sandboxed
 * virtual FS in B2 + simulated-but-real git object store), model via
 * callBestModel chain (survives computer off).
 */
import prisma from '@/lib/prisma'
import { callBestModel } from '@/lib/ai-fallback'
import { MCP_TOOLS } from '@/lib/mcp/registry'

export type ChatOsAction =
  | 'chat' | 'terminal' | 'file_list' | 'file_read' | 'file_save'
  | 'git_status' | 'git_diff' | 'git_commit' | 'mcp_list' | 'mcp_call'
  | 'design_click' | 'plugin_list' | 'plugin_install' | 'task_list' | 'task_create'
  | 'preview_session'

export const ACTION_COSTS: Record<string, number> = {
  // FULL FREE (v11): every Chat OS action is free — usage still logged.
  chat: 0, terminal: 0, file_list: 0, file_read: 0, file_save: 0,
  git_status: 0, git_diff: 0, git_commit: 0, mcp_list: 0, mcp_call: 0,
  design_click: 0, plugin_list: 0, plugin_install: 0, task_list: 0, task_create: 0,
  preview_session: 0,
}

type Bill = { ok: true; remaining: number } | { ok: false; needed: number; balance: number; bkash: string; plans: any }

async function bill(userId: string, cost: number): Promise<Bill> {
  // FULL FREE (v11): always succeeds; keep a raw-SQL audit row (amount 0).
  try {
    await prisma.$executeRaw`
      INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
      VALUES (${'fcs_' + Date.now().toString(36)}, ${userId}, 0, 'chatos-free', ${'chatos usage (free)'}, 6000)
    `.catch(() => null)
  } catch { /* audit only */ }
  return { ok: true, remaining: -1 }
}

// ── Virtual project FS (B2-backed, sandboxed) ─────────────────────────────
// Keys: chatos/{userId}/files/{path} — "git" is a per-user JSON object store
// (commits/diffs) in the same prefix. No host shell: terminal is a curated
// command interpreter (safe subset), git ops operate on the virtual repo.
const B2 = { bucket: process.env.B2_BUCKET || 'hostamar-prod' }

let _S3: any = null
async function s3() {
  if (_S3) return _S3
  const { S3Client } = await import('@aws-sdk/client-s3')
  _S3 = new S3Client({
    region: process.env.B2_REGION || 'us-east-005',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    credentials: { accessKeyId: process.env.B2_ACCOUNT_ID || '', secretAccessKey: process.env.B2_APPLICATION_KEY || '' },
  })
  return _S3
}

function safePath(p: string): boolean {
  return !p.includes('..') && p.length < 200 && !p.startsWith('/')
}
function fk(userId: string, name: string): string { return `chatos/${userId}/files/${name.replace(/^\/+/, '')}` }
function gk(userId: string, name: string): string { return `chatos/${userId}/git.json` }

async function getObject(key: string): Promise<string | null> {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const r: any = await (await s3()).send(new GetObjectCommand({ Bucket: B2.bucket, Key: key }))
    const chunks: any[] = []
    for await (const c of r.Body) chunks.push(c)
    return Buffer.concat(chunks).toString('utf-8')
  } catch { return null }
}
async function putObject(key: string, body: string): Promise<boolean> {
  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    await (await s3()).send(new PutObjectCommand({ Bucket: B2.bucket, Key: key, Body: body, ContentType: 'text/plain' }))
    return true
  } catch { return false }
}

type GitState = { commits: Array<{ id: string; message: string; files: Record<string, string>; at: string }> }

async function readGit(userId: string): Promise<GitState> {
  const raw = await getObject(gk(userId, ''))
  if (!raw) return { commits: [] }
  try { return JSON.parse(raw) } catch { return { commits: [] } }
}

/** Snapshot all files for a commit. */
async function snapshotFiles(userId: string): Promise<Record<string, string>> {
  const s3mod: any = await import('@aws-sdk/client-s3')
  const { ListObjectsV2Command } = s3mod
  const r: any = await (await s3()).send(new ListObjectsV2Command({ Bucket: B2.bucket, Prefix: fk(userId, ''), MaxKeys: 500 }))
  const files: Record<string, string> = {}
  for (const o of r.Contents || []) {
    const name = String(o.Key).split('files/')[1]
    if (name) files[name] = await getObject(o.Key) || ''
  }
  return files
}

function diffSnapshots(prev: Record<string, string>, next: Record<string, string>): string {
  const lines: string[] = []
  const names = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const n of [...names].sort()) {
    if (prev[n] === next[n]) continue
    if (!(n in prev)) lines.push(`+ NEW FILE ${n} (${next[n].length}B)`)
    else if (!(n in next)) lines.push(`- DELETED ${n}`)
    else lines.push(`~ MODIFIED ${n}: ${prev[n].length}B → ${next[n].length}B`)
  }
  return lines.length ? lines.join('\n') : '(no changes)'
}

// ── Terminal: safe curated interpreter (NO host shell — serverless safe) ──
async function runTerminal(userId: string, rawCmd: string): Promise<string> {
  const cmd = rawCmd.trim()
  const [bin, ...args] = cmd.split(/\s+/)
  const help = `Hostamar Chat OS Terminal — commands:
  ls [path]                  list project files
  cat <file>                 read a file
  write <file> <content...>  write a file (billed separately by file_save)
  rm <file>                  delete a file
  git status | diff | log    virtual repo status/diff/history
  git commit -m "msg"        commit (1cr — billed by git_commit)
  npm run dev                preview hint (use the Preview panel)
  npx kilocode chat "msg"    ask the AI (use the Chat panel — 1cr)
  help                       this text`
  try {
    switch (bin) {
      case 'help': case '': return help
      case 'ls': {
        const s3mod: any = await import('@aws-sdk/client-s3')
  const { ListObjectsV2Command } = s3mod
        const r: any = await (await s3()).send(new ListObjectsV2Command({ Bucket: B2.bucket, Prefix: fk(userId, args[0] || ''), MaxKeys: 200 }))
        return (r.Contents || []).map((o: any) => String(o.Key).split('files/')[1]).join('\n') || '(empty)'
      }
      case 'cat': {
        if (!safePath(args[0] || '')) return 'invalid path'
        const c = await getObject(fk(userId, args[0]))
        return c ?? `cat: ${args[0]}: not found`
      }
      case 'rm': {
        if (!safePath(args[0] || '')) return 'invalid path'
        const dmod: any = await import('@aws-sdk/client-s3')
  const { DeleteObjectCommand } = dmod
        await (await s3()).send(new DeleteObjectCommand({ Bucket: B2.bucket, Key: fk(userId, args[0]) }))
        return `removed ${args[0]}`
      }
      case 'git': {
        const sub = args[0]
        if (sub === 'status') { const r: any = await runAction(userId, 'git_status', {}); return r.result?.output || 'git error' }
        if (sub === 'diff') { const r: any = await runAction(userId, 'git_diff', {}); return r.result?.output || 'git error' }
        if (sub === 'log') { const g = await readGit(userId); return g.commits.map(c => `${c.id} ${c.message} (${c.at})`).join('\n') || '(no commits)' }
        return `git: '${sub}' — use git status | diff | log | commit`
      }
      case 'npm': return 'npm: use the Preview panel (built-in browser) — serverless sandbox has no node process'
      case 'npx': return 'npx: use the Chat panel — every message is 1cr through the 120-model gateway'
      default: return `${bin}: command not found — try 'help'`
    }
  } catch (e: any) { return `error: ${e?.message?.slice(0, 120)}` }
}

// ── Main dispatcher ────────────────────────────────────────────────────────
export async function runAction(userId: string, action: string, args: any = {}): Promise<{ ok: boolean; result?: any; billed?: number; remaining?: number; error?: string; bkash?: string; plans?: any; needed?: number; balance?: number }> {
  const cost = ACTION_COSTS[action] ?? 1
  let remaining: number | undefined = undefined
  if (cost !== 0) {
    const b = await bill(userId, cost)
    if (!b.ok) return { ok: false, error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: b.bkash, plans: b.plans }
    remaining = b.remaining
  }

  switch (action) {
    case 'chat': {
      const history = Array.isArray(args.history) ? args.history.slice(-8) : []
      const { text, model, provider } = await callBestModel(
        [...history, { role: 'user', content: String(args.message || '').slice(0, 4000) }],
        'You are Hostamar Chat OS — a Claude-first coding assistant inside an Orca-style IDE. Bangla+English, production-grade answers.',
      )
      // usage-based add-on: 1cr per 1000 tokens, min already charged above
      const tokens = Math.ceil((String(args.message || '').length + text.length) / 4)
      const extra = Math.max(0, Math.ceil(tokens / 1000) - 1)
      if (extra > 0) {
        const b2 = await bill(userId, extra)
        if (b2.ok) remaining = b2.remaining
      }
      return { ok: true, result: { reply: text, model, provider }, remaining }
    }
    case 'terminal': {
      const out = await runTerminal(userId, String(args.command || 'help'))
      return { ok: true, result: { output: out }, remaining }
    }
    case 'file_list': {
      const s3mod: any = await import('@aws-sdk/client-s3')
  const { ListObjectsV2Command } = s3mod
      const r: any = await (await s3()).send(new ListObjectsV2Command({ Bucket: B2.bucket, Prefix: fk(userId, ''), MaxKeys: 500 }))
      const files = (r.Contents || []).map((o: any) => ({ name: String(o.Key).split('files/')[1], size: o.Size }))
      return { ok: true, result: { files } }
    }
    case 'file_read': {
      const name = String(args.path || '')
      if (!safePath(name)) return { ok: false, error: 'INVALID_PATH' }
      const content = await getObject(fk(userId, name))
      return content === null ? { ok: false, error: 'NOT_FOUND' } : { ok: true, result: { name, content } }
    }
    case 'file_save': {
      const name = String(args.path || '')
      if (!safePath(name)) return { ok: false, error: 'INVALID_PATH' }
      const okWrite = await putObject(fk(userId, name), String(args.content ?? '').slice(0, 500_000))
      return okWrite ? { ok: true, result: { saved: name }, remaining } : { ok: false, error: 'B2_WRITE_FAILED' }
    }
    case 'git_status': {
      const files = await snapshotFiles(userId)
      const g = await readGit(userId)
      const last = g.commits[g.commits.length - 1]
      const names = Object.keys(files)
      let out = `On branch main\n`
      out += last ? `Last commit: ${last.id} "${last.message}"\n` : 'No commits yet\n'
      if (!last) out += names.map(n => `Untracked: ${n}`).join('\n') || '(no files)'
      else {
        const changed = names.filter(n => last.files[n] !== files[n])
        const deleted = Object.keys(last.files).filter(n => !(n in files))
        out += changed.map(n => `modified: ${n}`).concat(deleted.map(n => `deleted: ${n}`)).join('\n') || 'nothing to commit, working tree clean'
      }
      return { ok: true, result: { output: out } }
    }
    case 'git_diff': {
      const files = await snapshotFiles(userId)
      const g = await readGit(userId)
      const last = g.commits[g.commits.length - 1]
      const d = last ? diffSnapshots(last.files, files) : Object.keys(files).map(n => `+ NEW FILE ${n} (${files[n].length}B)`).join('\n')
      return { ok: true, result: { output: d } }
    }
    case 'git_commit': {
      const files = await snapshotFiles(userId)
      const g = await readGit(userId)
      const last = g.commits[g.commits.length - 1]
      const d = last ? diffSnapshots(last.files, files) : Object.keys(files).map(n => `+ NEW FILE ${n}`).join('\n')
      if (d === '(no changes)') return { ok: true, result: { output: 'nothing to commit, working tree clean', commit: null }, remaining }
      const commit = {
        id: Math.random().toString(16).slice(2, 9),
        message: String(args.message || 'Chat OS commit').slice(0, 200),
        files, at: new Date().toISOString(),
      }
      g.commits.push(commit)
      await putObject(gk(userId, ''), JSON.stringify(g).slice(0, 400_000))
      return { ok: true, result: { output: `[main ${commit.id}] ${commit.message}\n${d}`, commit: { id: commit.id, message: commit.message } }, remaining }
    }
    case 'mcp_list': {
      return { ok: true, result: { tools: MCP_TOOLS.map(t => ({ server: t.server, name: t.name, costCr: t.costCr, description: t.description })) } }
    }
    case 'mcp_call': {
      const tool = MCP_TOOLS.find(t => t.name === args.tool)
      if (!tool) return { ok: false, error: 'TOOL_NOT_FOUND' }
      // dynamic cost: refund the flat 1cr if the tool costs differently, then bill the tool cost
      const r = await tool.run(args.args, userId)
      return { ok: true, result: r, remaining }
    }
    case 'design_click': {
      const { text } = await callBestModel(
        [{ role: 'user', content: `The user clicked this UI element in Design Mode: ${JSON.stringify(args.element || {})}. Suggest a precise, minimal change for it (Bangla+English).` }],
        'You are an Orca-style design agent. One crisp suggestion.',
      )
      return { ok: true, result: { suggestion: text, dropped: args.element }, remaining }
    }
    case 'plugin_list': {
      return { ok: true, result: { plugins: [
        { id: 'taskmaster', name: 'TaskMaster', desc: 'Task list for multi-agent coding', installed: true },
        { id: 'filesystem', name: 'Filesystem MCP', desc: 'readFile/writeFile/listDirectory', installed: true },
        { id: 'browser', name: 'Browser Automation', desc: 'Built-in preview browser + Design Mode', installed: true },
        { id: 'kilocode', name: 'KiloCode Agent', desc: '120-model gateway agent', installed: true },
      ] } }
    }
    case 'plugin_install': {
      return { ok: true, result: { installed: String(args.plugin || 'unknown'), note: 'plugin enabled for this workspace' }, remaining }
    }
    case 'task_list': {
      const raw = await getObject(`chatos/${userId}/tasks.json`)
      return { ok: true, result: { tasks: raw ? JSON.parse(raw) : [] } }
    }
    case 'task_create': {
      const raw = await getObject(`chatos/${userId}/tasks.json`)
      const tasks: any[] = raw ? JSON.parse(raw) : []
      const t = { id: 't' + Date.now().toString(36), title: String(args.title || 'task').slice(0, 120), status: 'pending', at: new Date().toISOString() }
      tasks.push(t)
      await putObject(`chatos/${userId}/tasks.json`, JSON.stringify(tasks).slice(0, 200_000))
      return { ok: true, result: { task: t }, remaining }
    }
    case 'preview_session': {
      return { ok: true, result: { url: '/api/admin/chat-os?preview=1', note: 'built-in preview browser active (Design Mode available)' }, remaining }
    }
    default:
      return { ok: false, error: 'UNKNOWN_ACTION' }
  }
}
