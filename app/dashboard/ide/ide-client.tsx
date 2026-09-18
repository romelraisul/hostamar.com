'use client'

import { useEffect, useState, useRef } from 'react'

const IDES = [
  { id: 'vscode', name: 'VS Code', icon: '💻', desc: 'সম্পূর্ণ VS Code ব্রাউজারে', price: 10 },
  { id: 'pycharm', name: 'PyCharm', icon: '🐍', desc: 'Python IDE', price: 15 },
  { id: 'jupyter', name: 'Jupyter', icon: '📊', desc: 'ডাটা সায়েন্স নোটবুক', price: 12 },
]

type IdeFile = { name: string; size?: number }

export default function IdeClient() {
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  // editor state
  const [files, setFiles] = useState<IdeFile[]>([])
  const [openFile, setOpenFile] = useState('app.js')
  const [code, setCode] = useState('// আপনার কোড লিখুন...\nconsole.log("Hello Hostamar! 🚀")')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/ide/server', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setSessions(data.servers || [])
        const running = (data.servers || []).find((s: any) => s.status === 'processing')
        if (running && !activeSession) setActiveSession(running)
      }
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // load file list when active session changes
  const loadFiles = async (serverId: string) => {
    try {
      const res = await fetch(`/api/ide/files?serverId=${encodeURIComponent(serverId)}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success) setFiles(d.files || [])
    } catch {}
  }
  useEffect(() => { if (activeSession?.inputs?.serverId) loadFiles(activeSession.inputs.serverId) }, [activeSession])

  const create = async (type: string) => {
    setBusy(type); setMsg('')
    try {
      const res = await fetch('/api/ide/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 402) { setMsg(`ক্রেডিট লাগবে ${data.needed}cr — ব্যালেন্স ${data.balance}cr। টপ-আপ: bKash ${data.bkash}`); return }
      if (!res.ok || !data.success) { setMsg(data.error || 'ব্যর্থ'); return }
      setMsg(`✅ ${data.type} IDE চালু (${data.serverId}) — ফ্রি`)
      await load()
      const created = { inputs: { serverId: data.serverId, ideType: data.type }, status: 'processing', id: data.orderId, createdAt: new Date().toISOString() }
      setActiveSession(created)
      loadFiles(data.serverId)
    } catch { setMsg('নেটওয়ার্ক সমস্যা') } finally { setBusy('') }
  }

  const save = async () => {
    if (!activeSession?.inputs?.serverId) { setMsg('আগে IDE সেশন চালু করুন'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/ide/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serverId: activeSession.inputs.serverId, filename: openFile, content: code }),
      })
      const d = await res.json()
      setMsg(d.success ? `💾 ${openFile} B2-তে সেভ হয়েছে (${d.size} bytes)` : `সেভ ব্যর্থ: ${d.error || 'unknown'}`)
      if (d.success) loadFiles(activeSession.inputs.serverId)
    } catch { setMsg('সেভ ব্যর্থ — নেটওয়ার্ক') } finally { setSaving(false) }
  }

  const run = async () => {
    setRunning(true); setOutput('')
    try {
      const res = await fetch('/api/ide/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: openFile.endsWith('.py') ? 'python' : 'javascript', code }),
      })
      const d = await res.json()
      setOutput(d.output || d.error || '(no output)')
    } catch { setOutput('রান ব্যর্থ — নেটওয়ার্ক') } finally { setRunning(false) }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">কোড এডিটর 💻</h1>
          <p className="mt-1 text-sm text-zinc-500">ব্রাউজারে সফটওয়্যার বানান — ফাইল B2-তে সেভ, কোড রান — ফ্রি আনলিমিটেড</p>
        </div>
        <a href="/dashboard/services/new?type=ide" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ নতুন IDE</a>
      </div>

      {msg && <div className="mt-4 rounded-lg bg-[#ECFDF5] p-3 text-sm text-[#0E7C3A]">{msg}</div>}

      {!activeSession && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {IDES.map(ide => (
            <div key={ide.id} className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{ide.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold">{ide.name}</h3>
                  <p className="text-xs text-zinc-500">{ide.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0E7C3A]">ফ্রি</span>
                <button onClick={() => create(ide.id)} disabled={busy === ide.id}
                  className="rounded-lg bg-[#0E7C3A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300">
                  {busy === ide.id ? 'খুলছে...' : 'শুরু করুন'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSession && (
        <div className="mt-6 rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">● running</span>
              <span className="font-mono text-xs text-zinc-500">{activeSession.inputs?.serverId}</span>
              <span className="text-xs text-zinc-400">({activeSession.inputs?.ideType})</span>
            </div>
            <button onClick={() => setActiveSession(null)} className="text-xs text-zinc-500 hover:text-zinc-800">← সব IDE</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_1fr]">
            {/* file explorer */}
            <div className="border-r p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-600">ফাইলস</p>
                <button onClick={() => fileRef.current?.click()} className="rounded border px-1.5 text-xs hover:bg-zinc-50">+ new</button>
                <input ref={fileRef} className="hidden" defaultValue="" placeholder="name.js"
                  onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setOpenFile(e.currentTarget.value.trim()); setCode('// new file\n'); e.currentTarget.value = '' } }} />
              </div>
              <div className="mt-2 space-y-1">
                {files.length === 0 && <p className="text-xs text-zinc-400">B2 ফোল্ডার খালি — ফাইল সেভ করুন</p>}
                {files.map(f => (
                  <button key={f.name} onClick={() => setOpenFile(f.name)}
                    className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${openFile === f.name ? 'bg-[#ECFDF5] text-[#0E7C3A]' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                    📄 {f.name}
                  </button>
                ))}
                <button onClick={() => setOpenFile('app.js')} className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${openFile === 'app.js' ? 'bg-[#ECFDF5] text-[#0E7C3A]' : 'text-zinc-600 hover:bg-zinc-50'}`}>📄 app.js</button>
              </div>
            </div>
            {/* editor */}
            <div className="flex flex-col border-r">
              <div className="flex items-center justify-between border-b p-2">
                <span className="font-mono text-xs text-zinc-500">{openFile}</span>
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving} className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50">{saving ? '...' : '💾 সেভ'}</button>
                  <button onClick={run} disabled={running} className="rounded-lg bg-[#0E7C3A] px-3 py-1 text-xs font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300">{running ? 'রান...' : '▶ রান'}</button>
                </div>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                className="h-[50vh] w-full resize-none bg-zinc-900 p-3 font-mono text-xs text-emerald-100 focus:outline-none"
              />
            </div>
            {/* output */}
            <div className="flex flex-col">
              <div className="border-b p-2 text-xs font-semibold text-zinc-600">আউটপুট</div>
              <pre className="h-[50vh] overflow-auto bg-black p-3 font-mono text-xs text-lime-300">{output || '$ রান চাপুন...'}</pre>
            </div>
          </div>
        </div>
      )}

      {sessions.length > 0 && !activeSession && (
        <div className="mt-8">
          <h2 className="font-semibold">আমার IDE সেশন ({sessions.length})</h2>
          <div className="mt-3 space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                <span>{s.inputs?.ideType || s.serviceId} ({s.inputs?.serverId || ''}) • {new Date(s.createdAt).toLocaleString('bn-BD')}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{s.status === 'processing' ? 'running' : s.status}</span>
                  <button onClick={() => setActiveSession(s)} className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-white">ওপেন →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="mt-6 text-sm text-zinc-500">লোড হচ্ছে...</p>}
    </div>
  )
}
