'use client'
export const dynamic = 'force-dynamic'

/**
 * /dashboard/admin/chat-os — Hostamar Chat OS, Orca-IDE style. Full functional:
 * Chat (120 models, /tools //resources //prompts commands) + Terminal + Files +
 * Git (status/diff/commit) + MCP servers panel + Plugins/TaskMaster + built-in
 * Preview browser with Design Mode (click any element → drops into chat).
 * STRICT CREDIT: every billable action deducts (chat 1cr, terminal 1cr, save
 * 1cr, commit 1cr, design-click 1cr, plugin 5cr, task 2cr, preview 5cr);
 * viewing is free. 402 → bKash modal.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Terminal as TerminalIcon, Files, GitBranch, Sparkles, Boxes, Plug, ListTodo,
  MonitorPlay, MousePointerClick, Send, Loader2, Coins, Plus, Trash2, X, Save,
  Play, RefreshCw, ChevronDown, Image as ImageIcon,
} from 'lucide-react'

const GREEN = '#0E7C3A'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string; meta?: string }
type FileEntry = { name: string; size?: number }
type Task = { id: string; title: string; status: string }
type McpTool = { server: string; name: string; costCr: number; description: string }
type Tab = 'terminal' | 'git' | 'mcp' | 'plugins'

async function api(action: string, args: any = {}) {
  const res = await fetch('/api/admin/chat-os', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args }),
  })
  const d = await res.json().catch(() => ({}))
  return { status: res.status, ...(d as any) }
}

export default function ChatOsPage() {
  const [credits, setCredits] = useState<number | null>(null)
  const [model, setModel] = useState('kilo-auto/free')
  const [models, setModels] = useState<Array<{ id: string; free: boolean }>>([])
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'system', content: 'Hostamar Chat OS — Orca IDE। প্রজেক্ট খুলুন, চ্যাট করুন, টার্মিনাল চালান, ফাইল সেভ করুন, git commit করুন — সব এক জায়গায়।' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<string[]>(['chat-os-workspace'])
  const [branch, setBranch] = useState('main')

  // files
  const [files, setFiles] = useState<FileEntry[]>([])
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [dirty, setDirty] = useState(false)

  // bottom tabs
  const [tab, setTab] = useState<Tab>('terminal')
  const [termLines, setTermLines] = useState<string[]>(['Hostamar Chat OS Terminal — "help" লিখুন'])
  const [termCmd, setTermCmd] = useState('')
  const [gitOut, setGitOut] = useState('')
  const [commitMsg, setCommitMsg] = useState('')
  const [mcpTools, setMcpTools] = useState<McpTool[]>([])
  const [plugins, setPlugins] = useState<any[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskTitle, setTaskTitle] = useState('')

  // preview / design mode
  const [designMode, setDesignMode] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:40px">\n  <h1>My App Preview</h1>\n  <button id="btn1" style="padding:12px 24px;background:#0E7C3A;color:#fff;border:0;border-radius:8px">Click Me</button>\n</body></html>')

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
    loadFiles()
    api('mcp_list').then(d => setMcpTools(d.result?.tools || [])).catch(() => {})
    api('plugin_list').then(d => setPlugins(d.result?.plugins || [])).catch(() => {})
    api('task_list').then(d => setTasks(d.result?.tasks || [])).catch(() => {})
  }, [refreshCredits])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const loadFiles = useCallback(async () => {
    const d = await api('file_list')
    setFiles(d.result?.files || [])
  }, [])
  useEffect(() => { loadFiles() }, [loadFiles])

  const afterAction = (d: any) => {
    if (typeof d.remaining === 'number' && d.remaining >= 0) setCredits(d.remaining)
    if (d.status === 402) {
      setMsgs(m => [...m, { role: 'system', content: `⚠ ক্রেডিট শেষ — দরকার ${d.needed}cr। bKash ${d.bkash} → টপ-আপ করুন (plans: ${JSON.stringify(d.plans || {})})` }])
    }
  }

  // ── Chat ──
  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: text }])

    // Orca-style chat commands
    if (text === '/tools' || text === '/resources' || text === '/prompts') {
      const d = await api('mcp_list')
      const list = (d.result?.tools || []).map((t: McpTool) => `• ${t.server} :: ${t.name} (${t.costCr === 0 ? 'free' : t.costCr + 'cr'}) — ${t.description}`).join('\n')
      setMsgs(m => [...m, { role: 'system', content: `Available MCP tools:\n${list}` }])
      return
    }

    setBusy(true)
    try {
      const history = msgs.filter(m => m.role !== 'system').slice(-8).map(m => ({ role: m.role, content: m.content }))
      const d = await api('chat', { message: text, history })
      afterAction(d)
      if (d.success) {
        setMsgs(m => [...m, { role: 'assistant', content: d.result.reply, meta: `${d.result.model} • ${d.result.provider}` }])
      } else if (d.status !== 402) {
        setMsgs(m => [...m, { role: 'system', content: d.error || 'failed' }])
      }
    } finally { setBusy(false) }
  }

  // ── Terminal ──
  const runTerm = async (raw?: string) => {
    const cmd = (raw ?? termCmd).trim()
    if (!cmd) return
    setTermCmd('')
    setTermLines(l => [...l, `$ ${cmd}`])
    const d = await api('terminal', { command: cmd })
    afterAction(d)
    setTermLines(l => [...l, String(d.result?.output || d.error || 'error')])
    loadFiles()
  }

  // ── Files ──
  const openF = async (name: string) => {
    const d = await api('file_read', { path: name })
    if (d.ok) { setOpenFile(name); setFileContent(d.result.content); setDirty(false) }
    else setTermLines(l => [...l, `cat: ${name}: ${d.error}`])
  }
  const saveF = async () => {
    if (!openFile) return
    const d = await api('file_save', { path: openFile, content: fileContent })
    afterAction(d)
      if (d.ok) { setDirty(false); loadFiles(); setTermLines(l => [...l, "saved " + openFile + " (1cr)"]) }
  }
  const newFile = async () => {
    const name = prompt('নতুন ফাইলের নাম (যেমন index.html)')
    if (!name) return
    const d = await api('file_save', { path: name, content: '' })
    afterAction(d)
    loadFiles()
  }
  const delF = async (name: string) => {
    if (!confirm(`${name} ডিলিট?`)) return
    await api('terminal', { command: `rm ${name}` })
    afterAction({} as any)
    if (openFile === name) { setOpenFile(null); setFileContent('') }
    loadFiles()
  }

  // ── Git ──
  const git = async (sub: 'status' | 'diff' | 'commit') => {
    if (sub === 'commit') {
      if (!commitMsg.trim()) { setGitOut('commit message দিন'); return }
      const d = await api('git_commit', { message: commitMsg })
      afterAction(d)
      setCommitMsg('')
      setGitOut(d.result?.output || d.error || '')
    } else {
      const d = await api(`git_${sub}`)
      setGitOut(d.result?.output || d.error || '')
    }
  }

  // ── Plugins / Tasks ──
  const installPlugin = async (id: string) => {
    const d = await api('plugin_install', { plugin: id })
    afterAction(d)
    setTermLines(l => [...l, `plugin ${id} ${d.ok ? 'installed (5cr)' : 'failed'}`])
  }
  const addTask = async () => {
    if (!taskTitle.trim()) return
    const d = await api('task_create', { title: taskTitle })
    afterAction(d)
    setTaskTitle('')
    const t = await api('task_list')
    setTasks(t.result?.tasks || [])
  }

  // ── MCP call ──
  const callTool = async (t: McpTool) => {
    setMsgs(m => [...m, { role: 'user', content: `[/mcp ${t.name}]` }])
    const d = await api('mcp_call', { tool: t.name, args: {} })
    afterAction(d)
    setMsgs(m => [...m, { role: 'assistant', content: `**${t.name}** →\n\`\`\`\n${JSON.stringify(d.result, null, 2).slice(0, 1500)}\n\`\`\`` }])
  }

  // ── Design Mode ──
  const startPreview = async () => {
    const d = await api('preview_session')
    afterAction(d)
    if (d.ok) setTermLines(l => [...l, `preview session active (5cr/hr) — Design Mode ready`])
  }
  const onPreviewClick = (e: React.MouseEvent) => {
    if (!designMode) return
    e.preventDefault()
    const el = e.target as HTMLElement
    const element = {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      text: (el.textContent || '').slice(0, 60),
      classes: el.className?.slice?.(0, 80),
    }
    api('design_click', { element }).then(d => {
      afterAction(d)
      setMsgs(m => [...m, { role: 'user', content: `[Design Mode] clicked: ${element.tag}${element.id ? '#' + element.id : ''} "${element.text}"` }])
      setMsgs(m => [...m, { role: 'assistant', content: d.result?.suggestion || 'clicked' }])
    })
  }

  const pct = credits != null ? Math.min(100, Math.round((credits / 6000) * 100)) : 0

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100" style={{ fontSize: 13 }}>
      {/* ── TOP BAR ── */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-3 py-2">
        <span className="font-bold">Hostamar Chat OS</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">Orca IDE</span>
        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
          <select className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px]">
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> session active</div>
        <GitBranch className="h-3.5 w-3.5 text-zinc-500" /><span className="text-[11px] text-zinc-400">{branch}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-zinc-500">bKash 01822417463</span>
          <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px]">
            <Coins className="h-3 w-3" style={{ color: GREEN }} />
            {credits != null ? credits.toLocaleString('bn-BD') : '…'} cr
            <span className="h-1 w-8 overflow-hidden rounded-full bg-zinc-700"><span className="block h-full" style={{ width: `${pct}%`, background: GREEN }} /></span>
          </span>
          <select value={model} onChange={e => setModel(e.target.value)} className="max-w-40 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px]">
            {models.map(m => <option key={m.id}>{m.id}{m.free ? ' ✓free' : ''}</option>)}
          </select>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">MCP {mcpTools.length}</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">WebMCP ✓</span>
        </div>
      </header>

      {/* ── MAIN 3-PANEL ── */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: File Explorer */}
        <aside className="flex w-56 flex-col border-r border-zinc-800" style={{ minWidth: 180 }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1"><Files className="h-3.5 w-3.5" /> FILES</span>
            <button onClick={newFile} title="New file (1cr on save)"><Plus className="h-3.5 w-3.5 hover:text-white" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {files.length === 0 && <p className="px-2 py-1 text-[10px] text-zinc-600">চ্যাটে ফাইল বানাতে বলুন, বা + চাপুন</p>}
            {files.map(f => (
              <div key={f.name} className="group flex items-center">
                <button onClick={() => openF(f.name)} className={`flex-1 truncate rounded px-2 py-1 text-left text-[11px] hover:bg-zinc-800 ${openFile === f.name ? 'bg-zinc-800 text-white' : 'text-zinc-300'}`}>
                  📄 {f.name}
                </button>
                <button onClick={() => delF(f.name)} className="hidden px-1 group-hover:block"><Trash2 className="h-3 w-3 text-zinc-600 hover:text-red-400" /></button>
              </div>
            ))}
          </div>
          {openFile && (
            <div className="border-t border-zinc-800 p-1">
              <button onClick={saveF} disabled={!dirty} className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold disabled:bg-zinc-800 disabled:text-zinc-600" style={{ background: dirty ? GREEN : undefined }}>
                <Save className="h-3 w-3" /> সেভ (1cr)
              </button>
            </div>
          )}
        </aside>

        {/* CENTER: Chat OS */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-[#0E7C3A] text-white' : m.role === 'system' ? 'mx-auto bg-zinc-900 text-zinc-400' : 'bg-zinc-800 text-zinc-100'}`}>
                {m.content}
                {m.meta && <p className="mt-1 text-[9px] text-zinc-500">{m.meta}</p>}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-[11px] text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-zinc-800 p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={2}
                placeholder="চ্যাট করুন (1cr) — /tools দেখুন MCP tools…  |  Shift+Enter নতুন লাইন"
                className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[12px] focus:border-[#0E7C3A] focus:outline-none"
              />
              <button onClick={send} disabled={busy || !input.trim()} className="rounded-xl p-2.5 disabled:bg-zinc-800" style={{ background: GREEN }}>
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT: Preview + Design Mode */}
        <aside className="hidden w-72 flex-col border-l border-zinc-800 lg:flex" style={{ minWidth: 260 }}>
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1"><MonitorPlay className="h-3.5 w-3.5" /> PREVIEW</span>
            <div className="flex items-center gap-1">
              <button onClick={startPreview} title="Start session (5cr/hr)" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] hover:bg-zinc-800"><Play className="h-3 w-3" /> 5cr/hr</button>
              <button onClick={() => setDesignMode(v => !v)} title="Design Mode: click any element → drops into chat (1cr per click)"
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${designMode ? 'font-bold text-white' : 'hover:bg-zinc-800'}`}
                style={designMode ? { background: GREEN } : undefined}>
                <MousePointerClick className="h-3 w-3" /> Design {designMode ? 'ON' : ''}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white" onClick={onPreviewClick} style={{ cursor: designMode ? 'crosshair' : 'default' }}>
            <iframe
              title="preview"
              srcDoc={previewHtml}
              className="h-full w-full border-0"
              sandbox="allow-scripts"
            />
          </div>
          <div className="border-t border-zinc-800 p-1.5">
            <textarea
              value={previewHtml}
              onChange={e => setPreviewHtml(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 font-mono text-[9px] text-zinc-300 focus:outline-none"
            />
            <p className="mt-1 text-[9px] text-zinc-600">{designMode ? 'Design Mode: preview-এ যেকোনো element ক্লিক করুন → চ্যাটে যাবে (1cr)' : 'Design Mode off'}</p>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM: Terminal / Git / MCP / Plugins+Tasks ── */}
      <section className="h-64 shrink-0 border-t border-zinc-800" style={{ minHeight: 160 }}>
        <div className="flex items-center gap-1 border-b border-zinc-800 px-2">
          {([['terminal', TerminalIcon, 'TERMINAL'], ['git', GitBranch, 'SOURCE CONTROL'], ['mcp', Boxes, 'MCP SERVERS'], ['plugins', Plug, 'PLUGINS + TASKMASTER']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1 border-b-2 px-2.5 py-1.5 text-[10px] font-semibold ${tab === id ? 'border-[#0E7C3A] text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {/* Terminal */}
        {tab === 'terminal' && (
          <div className="flex h-[calc(100%-29px)] flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-lime-300">
              {termLines.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)}
            </div>
            <div className="flex items-center gap-1 border-t border-zinc-800 px-2 py-1.5">
              <span className="font-mono text-[11px] text-emerald-400">$</span>
              <input value={termCmd} onChange={e => setTermCmd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runTerm() }}
                placeholder="help · ls · cat file · git status · git commit -m …  (1cr/cmd)"
                className="flex-1 bg-transparent font-mono text-[11px] text-zinc-100 focus:outline-none" />
            </div>
          </div>
        )}

        {/* Git */}
        {tab === 'git' && (
          <div className="flex h-[calc(100%-29px)] flex-col p-2">
            <div className="flex items-center gap-2">
              <button onClick={() => git('status')} className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[10px] hover:bg-zinc-800"><RefreshCw className="h-3 w-3" /> Status</button>
              <button onClick={() => git('diff')} className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[10px] hover:bg-zinc-800">Diff</button>
              <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="commit message"
                className="w-52 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] focus:outline-none" />
              <button onClick={() => git('commit')} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white" style={{ background: GREEN }}>✓ Commit (1cr)</button>
            </div>
            <pre className="mt-2 min-h-0 flex-1 overflow-auto rounded-lg bg-zinc-900 p-2 font-mono text-[10px] text-zinc-300">{gitOut || 'git status / diff দেখুন — commit করুন Chat OS থেকেই'}</pre>
          </div>
        )}

        {/* MCP */}
        {tab === 'mcp' && (
          <div className="h-[calc(100%-29px)] overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {mcpTools.map(t => (
                <button key={t.name} onClick={() => callTool(t)} className="rounded-xl border border-zinc-800 p-2 text-left hover:border-[#0E7C3A]">
                  <p className="truncate text-[10px] font-bold text-zinc-200">{t.name}</p>
                  <p className="truncate text-[9px] text-zinc-500">{t.server}</p>
                  <p className="mt-0.5 text-[9px]" style={{ color: t.costCr === 0 ? '#6ee7b7' : GREEN }}>{t.costCr === 0 ? 'free' : `${Math.abs(t.costCr) === 1 ? 1 : t.costCr}cr`}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plugins + Tasks */}
        {tab === 'plugins' && (
          <div className="grid h-[calc(100%-29px)] grid-cols-2 gap-2 p-2">
            <div className="min-h-0 overflow-y-auto">
              <p className="mb-1 text-[10px] font-bold text-zinc-400">PLUGINS</p>
              {plugins.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-2 py-1.5">
                  <div><p className="text-[10px] font-semibold text-zinc-200">{p.name}</p><p className="text-[9px] text-zinc-500">{p.desc}</p></div>
                  {p.installed ? <span className="text-[9px] text-emerald-400">✓ active</span>
                    : <button onClick={() => installPlugin(p.id)} className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ background: GREEN }}>Install (5cr)</button>}
                </div>
              ))}
            </div>
            <div className="flex min-h-0 flex-col">
              <p className="mb-1 text-[10px] font-bold text-zinc-400">TASKMASTER</p>
              <div className="mb-1 flex gap-1">
                <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="নতুন টাস্ক (2cr)"
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] focus:outline-none" />
                <button onClick={addTask} className="rounded-lg px-2 text-[10px] font-semibold text-white" style={{ background: GREEN }}>+</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2 py-1.5 text-[10px]">
                    <ListTodo className="h-3 w-3 text-zinc-500" /> <span className="truncate text-zinc-300">{t.title}</span>
                    <span className="ml-auto rounded-full bg-zinc-800 px-1.5 text-[9px] text-zinc-400">{t.status}</span>
                  </div>
                ))}
                {tasks.length === 0 && <p className="px-1 text-[9px] text-zinc-600">কোনো টাস্ক নেই</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
