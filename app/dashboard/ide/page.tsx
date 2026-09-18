'use client'
export const dynamic = 'force-dynamic'

/**
 * /dashboard/ide — ORCA ADE (V12): vibe-code with our model + MCP.
 * Workspaces (isolated worktrees, fan-across-agents) · File explorer ·
 * Vibe-code chat (120 PAID models, /tools //resources //prompts) ·
 * Preview + Design Mode (click → chat) · Ghostty-style terminal ·
 * Source control (diff/commit) · MCP servers · Plugins/TaskMaster ·
 * Fleet. ALL PAID (V12): worktree 5cr, chat = market token price,
 * terminal 1cr, commit 1cr, design-click 1cr, plugin 5cr, task 2cr.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Files, GitBranch, GitMerge, Send, Loader2, Coins, Plus, Trash2, Save,
  Play, MousePointerClick, Boxes, Plug, ListTodo, Sparkles, User, MonitorPlay, Terminal as TermIcon,
} from 'lucide-react'

const GREEN = '#0E7C3A'
type Msg = { role: 'user' | 'assistant' | 'system'; content: string; meta?: string }
type Worktree = { id: string; name: string; agent: string; status: string; createdAt: string }
type FileEntry = { name: string; size?: number }
type McpTool = { server: string; name: string; costCr: number; description: string }
type Client = { id: string; name: string; vendor: string; note: string }
type Tab = 'terminal' | 'git' | 'mcp' | 'fleet'

async function osApi(action: string, args: any = {}) {
  const res = await fetch('/api/admin/chat-os', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args }),
  })
  const d = await res.json().catch(() => ({}))
  return { status: res.status, ...(d as any) }
}
async function ideApi(action: string, args: any = {}) {
  const res = await fetch('/api/orca', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args }),
  })
  const d = await res.json().catch(() => ({}))
  return { status: res.status, ...(d as any) }
}

export default function OrcaIdePage() {
  const [credits, setCredits] = useState<number | null>(null)
  const [model, setModel] = useState('hostamar-1m-a')
  const [models, setModels] = useState<Array<{ id: string; free: boolean }>>([])
  const [priceLbl, setPriceLbl] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'system', content: 'Orca ADE — Hostamar-এ vibe code করুন। Worktree খুলুন, 120 PAID মডেল বাছুন, এজেন্ট fan করুন।' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const [worktrees, setWorktrees] = useState<Worktree[]>([])
  const [activeWt, setActiveWt] = useState<Worktree | null>(null)
  const [fanCount, setFanCount] = useState(3)
  const [fanResults, setFanResults] = useState<any[]>([])

  const [files, setFiles] = useState<FileEntry[]>([])
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [dirty, setDirty] = useState(false)

  const [tab, setTab] = useState<Tab>('terminal')
  const [termLines, setTermLines] = useState<string[]>(['Orca ADE Terminal — "help" লিখুন'])
  const [termCmd, setTermCmd] = useState('')
  const [gitOut, setGitOut] = useState('')
  const [commitMsg, setCommitMsg] = useState('')
  const [mcpTools, setMcpTools] = useState<McpTool[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const [designMode, setDesignMode] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:40px">\n  <h1>My App Preview</h1>\n  <button id="btn1" style="padding:12px;background:#0E7C3A;color:#fff;border:0;border-radius:8px">Click Me</button>\n</body></html>')

  const endRef = useRef<HTMLDivElement>(null)

  const refreshCredits = useCallback(() => {
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.creditsBalance != null) setCredits(d.creditsBalance) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshCredits()
    fetch('/api/v1/models', { credentials: 'include' }).then(r => r.json())
      .then(d => setModels((d.data || []).map((m: any) => ({ id: m.id, free: !!m.free }))))
      .catch(() => {})
    ideApi('list_worktrees').then(d => setWorktrees(d.result?.worktrees || [])).catch(() => {})
    osApi('mcp_list').then(d => setMcpTools(d.result?.tools || [])).catch(() => {})
    ideApi('clients').then(d => setClients(d.result?.clients || [])).catch(() => {})
    loadFiles()
    fetch('/api/orca/price?model=hostamar-1m-a').then(r => r.json()).then(d => setPriceLbl(d.label || '')).catch(() => {})
  }, [refreshCredits])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const loadFiles = useCallback(async () => {
    const d = await osApi('file_list')
    setFiles(d.result?.files || [])
  }, [])
  useEffect(() => { loadFiles() }, [loadFiles])

  const afterAction = (d: any) => {
    if (typeof d.remaining === 'number' && d.remaining >= 0) setCredits(d.remaining)
    if (d.status === 402) {
      setMsgs(m => [...m, { role: 'system', content: `⚠ ক্রেডিট কম — দরকার ${d.needed}cr। bKash ${d.bkash} → Starter 599TK→6000cr / Pro 1299TK→13000cr / Business 2999TK→30000cr (1cr=1TK)` }])
    }
  }

  // ── Vibe chat (PAID token price per model) ──
  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: text }])
    if (text === '/tools' || text === '/resources' || text === '/prompts') {
      const d = await osApi('mcp_list')
      const list = (d.result?.tools || []).map((t: McpTool) => `• ${t.server} :: ${t.name} — ${t.description}`).join('\n')
      setMsgs(m => [...m, { role: 'system', content: `MCP tools:\n${list}` }])
      return
    }
    setBusy(true)
    try {
      const history = msgs.filter(m => m.role !== 'system').slice(-8).map(m => ({ role: m.role, content: m.content }))
      const d = await osApi('chat', { message: text, history, model })
      afterAction(d)
      if (d.success) {
        setMsgs(m => [...m, { role: 'assistant', content: d.result.reply, meta: `${d.result.model} • ${d.result.provider}${d.result.pricing ? ` • ${d.result.pricing.credits}cr` : ''}` }])
      } else if (d.status !== 402) {
        setMsgs(m => [...m, { role: 'system', content: d.error || 'failed' }])
      }
    } finally { setBusy(false) }
  }

  // ── Worktrees ──
  const createWt = async () => {
    const name = prompt('Worktree নাম (যেমন feat/login-page)')
    if (!name) return
    const d = await ideApi('create_worktree', { name, agent: model })
    afterAction(d)
    const w = d.result?.worktree
    if (w) { setWorktrees(t => [...t, w]); setActiveWt(w) }
  }
  const fan = async () => {
    const prompt = input.trim() || msgs.filter(m => m.role === 'user').slice(-1)[0]?.content
    if (!prompt) return
    const ids = worktrees.slice(-fanCount).map(w => w.id)
    if (!ids.length) { setTermLines(l => [...l, 'আগে worktree খুলুন']); return }
    setBusy(true)
    setMsgs(m => [...m, { role: 'user', content: `[fan ×${ids.length}] ${prompt}` }])
    try {
      const d = await ideApi('fan_prompt', { prompt, worktreeIds: ids, model })
      afterAction(d)
      if (d.success) {
        setFanResults(d.result?.results || [])
        d.result?.results?.forEach((r: any) => {
          setMsgs(m => [...m, { role: 'assistant', content: `**${r.worktreeId}** (${r.provider}/${r.model}):\n${r.reply.slice(0, 600)}` }])
        })
      }
    } finally { setBusy(false) }
  }

  // ── Files ──
  const openF = async (name: string) => {
    const d = await osApi('file_read', { path: name })
    if (d.ok) { setOpenFile(name); setFileContent(d.result.content); setDirty(false) }
  }
  const saveF = async () => {
    if (!openFile) return
    const d = await osApi('file_save', { path: openFile, content: fileContent })
    afterAction(d)
    if (d.ok) { setDirty(false); loadFiles() }
  }

  // ── Terminal / Git ──
  const runTerm = async (raw?: string) => {
    const cmd = (raw ?? termCmd).trim()
    if (!cmd) return
    setTermCmd('')
    setTermLines(l => [...l, `$ ${cmd}`])
    const d = await osApi('terminal', { command: cmd })
    afterAction(d)
    setTermLines(l => [...l, String(d.result?.output || d.error || 'error')])
    loadFiles()
  }
  const git = async (sub: 'status' | 'diff' | 'commit') => {
    if (sub === 'commit') {
      if (!commitMsg.trim()) { setGitOut('commit message দিন'); return }
      const d = await osApi('git_commit', { message: commitMsg })
      afterAction(d); setCommitMsg('')
      setGitOut(d.result?.output || d.error || '')
    } else {
      const d = await osApi(`git_${sub}`)
      setGitOut(d.result?.output || d.error || '')
    }
  }

  // ── Design Mode ──
  const onPreviewClick = (e: React.MouseEvent) => {
    if (!designMode) return
    e.preventDefault()
    const el = e.target as HTMLElement
    const element = { tag: el.tagName.toLowerCase(), id: el.id || undefined, text: (el.textContent || '').slice(0, 60) }
    osApi('design_click', { element }).then(d => {
      afterAction(d)
      setMsgs(m => [...m, { role: 'user', content: `[Design] clicked ${element.tag}${element.id ? '#' + element.id : ''}` }])
      setMsgs(m => [...m, { role: 'assistant', content: d.result?.suggestion || 'clicked' }])
    })
  }

  const pct = credits != null ? Math.min(100, Math.round((credits / 6000) * 100)) : 0

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100" style={{ fontSize: 13 }}>
      {/* TOP BAR */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-3 py-2">
        <span className="font-bold">Hostamar IDE</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">Orca ADE</span>
        <span className="text-[11px] text-zinc-400">Worktrees: {worktrees.length}</span>
        <GitBranch className="h-3.5 w-3.5 text-zinc-500" /><span className="text-[11px] text-zinc-400">main</span>
        <span className="text-[10px] text-zinc-500">bKash 01822417463</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px]">
            <Coins className="h-3 w-3" style={{ color: GREEN }} />
            {credits != null ? credits.toLocaleString('bn-BD') : '…'} cr
            <span className="h-1 w-8 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full" style={{ width: `${pct}%`, background: GREEN }} /></span>
          </span>
          <select value={model} onChange={e => { setModel(e.target.value); fetch(`/api/orca/price?model=${encodeURIComponent(e.target.value)}`).then(r => r.json()).then(d => setPriceLbl(d.label || '')) }}
            className="max-w-44 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px]">
            {models.map(m => <option key={m.id}>{m.id} • PAID</option>)}
          </select>
          {priceLbl && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">{priceLbl}</span>}
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">MCP {mcpTools.length}</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">WebMCP ✓</span>
          <User className="h-4 w-4 text-zinc-500" />
        </div>
      </header>

      {/* MAIN */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: Workspaces (worktrees) */}
        <aside className="flex w-52 flex-col border-r border-zinc-800" style={{ minWidth: 190 }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span>WORKSPACES</span>
            <button onClick={createWt} title="New worktree (5cr)"><Plus className="h-3.5 w-3.5 hover:text-white" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {worktrees.length === 0 && <p className="px-2 py-1 text-[10px] text-zinc-600">+ চেপে নতুন isolated worktree খুলুন (5cr) — প্রতি এজেন্ট আলাদা worktree-তে প্যারালাল কাজ করবে</p>}
            {worktrees.map(w => (
              <button key={w.id} onClick={() => setActiveWt(w)}
                className={`block w-full rounded px-2 py-1 text-left text-[10px] hover:bg-zinc-800 ${activeWt?.id === w.id ? 'bg-zinc-800 text-white' : 'text-zinc-300'}`}>
                <GitMerge className="mr-1 inline h-3 w-3" />
                {w.name}
                <span className="block text-[9px] text-zinc-500">{w.agent} • {w.status}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-800 p-1.5">
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={5} value={fanCount} onChange={e => setFanCount(Math.max(1, Math.min(5, +e.target.value)))}
                className="w-12 rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 text-[10px]" />
              <button onClick={fan} disabled={busy} className="flex-1 rounded-lg py-1 text-[10px] font-semibold disabled:bg-zinc-800"
                style={{ background: busy ? undefined : GREEN, color: busy ? '#666' : '#fff' }}>
                ⚡ Fan ×{fanCount}
              </button>
            </div>
            <p className="mt-1 text-[9px] text-zinc-600">1 prompt → {fanCount} agents → merge winner (5cr/worktree)</p>
          </div>
        </aside>

        {/* FILE EXPLORER */}
        <aside className="flex w-48 flex-col border-r border-zinc-800" style={{ minWidth: 170 }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1"><Files className="h-3.5 w-3.5" /> FILES</span>
            <button onClick={async () => { const n = prompt('নতুন ফাইল?'); if (n) { const d = await osApi('file_save', { path: n, content: '' }); afterAction(d); loadFiles() } }}>
              <Plus className="h-3.5 w-3.5 hover:text-white" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {files.map(f => (
              <div key={f.name} className="group flex items-center">
                <button onClick={() => openF(f.name)} className={`flex-1 truncate rounded px-2 py-1 text-left text-[11px] hover:bg-zinc-800 ${openFile === f.name ? 'bg-zinc-800 text-white' : 'text-zinc-300'}`}>
                  📄 {f.name}
                </button>
                <button onClick={async () => { if (confirm(`${f.name} ডিলিট?`)) { await osApi('terminal', { command: `rm ${f.name}` }); loadFiles() } }} className="hidden px-1 group-hover:block">
                  <Trash2 className="h-3 w-3 text-zinc-600 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
          {openFile && (
            <div className="border-t border-zinc-800 p-1">
              <button onClick={saveF} disabled={!dirty} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold disabled:bg-zinc-800 disabled:text-zinc-600"
                style={{ background: dirty ? GREEN : undefined, color: dirty ? '#fff' : undefined }}>
                <Save className="h-3 w-3" /> সেভ (1cr)
              </button>
            </div>
          )}
        </aside>

        {/* CENTER: Vibe Code Chat */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-[#0E7C3A] text-white' : m.role === 'system' ? 'mx-auto bg-zinc-900 text-zinc-400' : 'bg-zinc-800 text-zinc-100'}`}>
                {m.content}
                {m.meta && <p className="mt-1 text-[9px] text-zinc-500">{m.meta}</p>}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-[11px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> agent thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-zinc-800 p-2">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={2}
                placeholder={`vibe code লিখুন (${model} • PAID token price) — /tools দেখুন · Shift+Enter নতুন লাইন`}
                className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[12px] focus:border-[#0E7C3A] focus:outline-none" />
              <button onClick={send} disabled={busy || !input.trim()} className="rounded-xl p-2.5 disabled:bg-zinc-800" style={{ background: GREEN }}>
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT: Preview + Design Mode */}
        <aside className="hidden w-72 flex-col border-l border-zinc-800 lg:flex" style={{ minWidth: 250 }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1"><MonitorPlay className="h-3.5 w-3.5" /> PREVIEW</span>
            <button onClick={() => setDesignMode(v => !v)} title="Design Mode: click element → chat (1cr)"
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${designMode ? 'font-bold text-white' : 'hover:bg-zinc-800'}`}
              style={designMode ? { background: GREEN } : undefined}>
              <MousePointerClick className="h-3 w-3" /> Design {designMode ? 'ON' : ''}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white" onClick={onPreviewClick} style={{ cursor: designMode ? 'crosshair' : 'default' }}>
            <iframe title="preview" srcDoc={previewHtml} className="h-full w-full border-0" sandbox="allow-scripts" />
          </div>
          <div className="border-t border-zinc-800 p-1.5">
            <textarea value={previewHtml} onChange={e => setPreviewHtml(e.target.value)} rows={4} spellCheck={false}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 font-mono text-[9px] text-zinc-300 focus:outline-none" />
            <p className="mt-1 text-[9px] text-zinc-600">{designMode ? 'Design Mode: element ক্লিক → chat (1cr)' : 'Design Mode off'}</p>
          </div>
        </aside>
      </div>

      {/* BOTTOM */}
      <section className="h-60 shrink-0 border-t border-zinc-800" style={{ minHeight: 140 }}>
        <div className="flex items-center gap-1 border-b border-zinc-800 px-2">
          {([['terminal', TermIcon, 'TERMINAL'], ['git', GitBranch, 'SOURCE CONTROL'], ['mcp', Boxes, 'MCP SERVERS'], ['fleet', Sparkles, 'AGENT FLEET']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1 border-b-2 px-2.5 py-1.5 text-[10px] font-semibold ${tab === id ? 'border-[#0E7C3A] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {tab === 'terminal' && (
          <div className="flex h-[calc(100%-29px)] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-lime-300">
              {termLines.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)}
            </div>
            <div className="flex items-center gap-1 border-t border-zinc-800 px-2 py-1.5">
              <span className="font-mono text-[11px] text-emerald-400">$</span>
              <input value={termCmd} onChange={e => setTermCmd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runTerm() }}
                placeholder="help · ls · cat · git status · git commit -m … (1cr/cmd)"
                className="flex-1 bg-transparent font-mono text-[11px] text-zinc-100 focus:outline-none" />
            </div>
          </div>
        )}

        {tab === 'git' && (
          <div className="flex h-[calc(100%-29px)] flex-col p-2">
            <div className="flex items-center gap-2">
              <button onClick={() => git('status')} className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] hover:bg-zinc-800">Status</button>
              <button onClick={() => git('diff')} className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] hover:bg-zinc-800">Diff</button>
              <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="commit message"
                className="w-52 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] focus:outline-none" />
              <button onClick={() => git('commit')} className="rounded-lg px-2 py-1 text-[10px] font-semibold text-white" style={{ background: GREEN }}>✓ Commit (1cr)</button>
            </div>
            <pre className="mt-2 min-h-0 flex-1 overflow-auto rounded-lg bg-zinc-900 p-2 font-mono text-[10px] text-zinc-300">{gitOut || 'git status / diff / commit — Orca-তেই রিভিউ করুন'}</pre>
          </div>
        )}

        {tab === 'mcp' && (
          <div className="h-[calc(100%-29px)] overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {mcpTools.map(t => (
                <button key={t.name} onClick={async () => {
                  const d = await osApi('mcp_call', { tool: t.name, args: {} })
                  afterAction(d)
                  setMsgs(m => [...m, { role: 'assistant', content: `**${t.name}** →\n\`\`\`\n${JSON.stringify(d.result, null, 2).slice(0, 1200)}\n\`\`\`` }])
                }} className="rounded-xl border border-zinc-800 p-2 text-left hover:border-[#0E7C3A]">
                  <p className="truncate text-[10px] font-bold text-zinc-200">{t.name}</p>
                  <p className="truncate text-[9px] text-zinc-500">{t.server}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'fleet' && (
          <div className="h-[calc(100%-29px)] overflow-y-auto p-2">
            <p className="mb-1 text-[10px] font-bold text-zinc-400">BRING YOUR OWN AGENT — {clients.length} clients supported</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {clients.map(c => (
                <div key={c.id} className={`rounded-xl border p-2 ${c.id === 'hostamar' || c.id === 'kilocode' ? 'border-[#0E7C3A]' : 'border-zinc-800'}`}>
                  <p className="text-[10px] font-bold text-zinc-200">{c.name} {c.id === 'hostamar' && <span className="text-[8px]" style={{ color: GREEN }}>BUILT-IN</span>}</p>
                  <p className="text-[9px] text-zinc-500">{c.vendor} — {c.note}</p>
                </div>
              ))}
            </div>
            {fanResults.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-zinc-400">FAN RESULTS ({fanResults.length})</p>
                {fanResults.map((r, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 p-2 text-[10px] text-zinc-300">
                    <b>{r.worktreeId}</b> — {r.provider}/{r.model}: {r.reply?.slice(0, 120)}…
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
