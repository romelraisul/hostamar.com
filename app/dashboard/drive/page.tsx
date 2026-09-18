'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hostamar Drive — V34 — Telegram MTProto as unlimited storage.
 * Google-Drive-style: folder sidebar, grid, upload w/ progress, search,
 * preview, share. Client component; auth via /api/auth/me (server identity).
 */

interface DriveFileRow {
  id: string; fileName: string; fileSize: string; mimeType: string; folderId: string | null; createdAt: string
}
interface DriveFolderRow { id: string; name: string; parentId: string | null }

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export default function DriveApp() {
  const [me, setMe] = useState<{ id: string; email: string } | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<DriveFolderRow[]>([])
  const [files, setFiles] = useState<DriveFileRow[]>([])
  const [usedBytes, setUsedBytes] = useState<number>(0)
  const [q, setQ] = useState('')
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [msg, setMsg] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [preview, setPreview] = useState<DriveFileRow | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null))
  }, [])

  const load = useCallback(async (fid: string | null, query: string) => {
    const url = new URL('/api/drive/list', window.location.origin)
    if (fid) url.searchParams.set('folderId', fid)
    if (query) url.searchParams.set('q', query)
    const r = await fetch(url.toString(), { credentials: 'include' })
    if (!r.ok) { setMsg('তালিকা লোড ব্যর্থ — লগ ইন আছে?'); return }
    const d = await r.json()
    setFolders(d.folders || [])
    setFiles(d.files || [])
    setUsedBytes(Number(d.usedBytes || 0))
  }, [])

  useEffect(() => { if (me) load(folderId, q) }, [me, folderId, q, load])

  async function upload(file: File) {
    setUploadPct(0); setUploadName(file.name); setMsg('')
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      const form = new FormData()
      form.append('file', file)
      if (folderId) form.append('folderId', folderId)
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)) }
      xhr.onload = async () => {
        setUploadPct(null)
        try {
          const d = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && d.ok) {
            setMsg(d.deduped ? `ডেডুপ — আগেই আছে: ${d.fileName}` : `আপলোড সম্পন্ন: ${d.fileName}`)
            await load(folderId, q)
          } else {
            setMsg(`আপলোড ব্যর্থ: ${d.error || d.detail || xhr.status}`)
          }
        } catch { setMsg(`আপলোড ব্যর্থ: HTTP ${xhr.status}`) }
        resolve()
      }
      xhr.onerror = () => { setUploadPct(null); setMsg('নেটওয়ার্ক ত্রুটি'); resolve() }
      xhr.open('POST', '/api/drive/upload')
      xhr.withCredentials = true
      xhr.send(form)
    })
  }

  async function createFolder() {
    if (!newFolder.trim()) return
    const r = await fetch('/api/drive/folder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name: newFolder, parentId: folderId }),
    })
    if (r.ok) { setNewFolder(''); await load(folderId, q) }
    else setMsg('ফোল্ডার তৈরি ব্যর্থ')
  }

  async function share(id: string) {
    const r = await fetch('/api/drive/share', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ id }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) {
      await navigator.clipboard.writeText(`${window.location.origin}${d.url}`).catch(() => {})
      setMsg(`শেয়ার লিংক (১ ঘণ্টা) কপি হয়েছে`)
    } else setMsg(`শেয়ার ব্যর্থ: ${d.error || r.status}`)
  }

  async function remove(id: string) {
    const r = await fetch(`/api/drive/file/${id}`, { method: 'DELETE', credentials: 'include' })
    if (r.ok) { setPreview(null); await load(folderId, q) } else setMsg('ডিলিট ব্যর্থ')
  }

  if (!me) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        ড্রাইভ লোড হচ্ছে… লগ ইন না থাকলে <a className="text-[#0E7C3A] underline" href="/login">লগ ইন করুন</a>।
      </div>
    )
  }

  const isPreviewable = preview && (preview.mimeType.startsWith('image/') || preview.mimeType.startsWith('video/') || preview.mimeType.startsWith('audio/'))

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Hostamar Drive</h1>
        <span className="rounded-full bg-[#0E7C3A]/10 px-2.5 py-1 text-xs font-semibold text-[#0E7C3A]">
          আনলিমিটেড — Telegram-backed · ব্যবহৃত {fmtBytes(usedBytes)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => fileInput.current?.click()}
          className="rounded-md bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b6230]"
        >+ আপলোড</button>
        <input ref={fileInput} type="file" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }} />
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="নতুন ফোল্ডারের নাম"
          className="rounded-md border px-3 py-2 text-sm outline-none focus:border-[#0E7C3A]"
        />
        <button onClick={createFolder} className="rounded-md border px-4 py-2 text-sm hover:border-[#0E7C3A]">ফোল্ডার তৈরি</button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="সার্চ…"
          className="ml-auto rounded-md border px-3 py-2 text-sm outline-none focus:border-[#0E7C3A]"
        />
        {folderId && <button onClick={() => setFolderId(null)} className="text-sm underline">← রুট</button>}
      </div>

      {uploadPct !== null && (
        <div className="rounded-md border p-3 text-sm">
          আপলোড হচ্ছে {uploadName}… {uploadPct}%
          <div className="mt-2 h-2 rounded bg-zinc-200"><div className="h-2 rounded bg-[#0E7C3A]" style={{ width: `${uploadPct}%` }} /></div>
        </div>
      )}
      {msg && <div className="rounded-md border bg-zinc-50 p-3 text-sm">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <aside className="space-y-1 text-sm">
          <div className="font-semibold text-zinc-600">ফোল্ডার</div>
          <button onClick={() => setFolderId(null)} className={`block w-full rounded px-2 py-1 text-left ${!folderId ? 'bg-[#0E7C3A]/10' : 'hover:bg-zinc-100'}`}>রুট</button>
          {folders.map((f) => (
            <button key={f.id} onClick={() => setFolderId(f.id)} className="block w-full rounded px-2 py-1 text-left hover:bg-zinc-100">📁 {f.name}</button>
          ))}
        </aside>

        <main className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.length === 0 && <div className="col-span-full text-sm text-zinc-500">কোনো ফাইল নেই — আপলোড করুন।</div>}
          {files.map((f) => (
            <div key={f.id} className="rounded-lg border p-3 text-sm space-y-2 hover:border-[#0E7C3A]">
              <button onClick={() => setPreview(f)} className="block w-full truncate text-left font-medium">{f.fileName}</button>
              <div className="text-xs text-zinc-500">{fmtBytes(Number(f.fileSize))}</div>
              <div className="flex gap-2 text-xs">
                <a href={`/api/drive/file/${f.id}`} target="_blank" className="underline">খুলুন</a>
                <button onClick={() => share(f.id)} className="underline">শেয়ার</button>
                <button onClick={() => remove(f.id)} className="underline text-red-600">ডিলিট</button>
              </div>
            </div>
          ))}
        </main>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-semibold truncate">{preview.fileName}</div>
              <button onClick={() => setPreview(null)} className="text-sm text-zinc-500">✕</button>
            </div>
            {isPreviewable ? (
              preview.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/drive/file/${preview.id}`} alt={preview.fileName} className="max-h-[65vh] w-auto mx-auto" />
              ) : (
                <video src={`/api/drive/file/${preview.id}`} controls className="max-h-[65vh] w-full" />
              )
            ) : (
              <div className="text-sm text-zinc-500">প্রিভিউ নেই — <a className="underline" href={`/api/drive/file/${preview.id}`} target="_blank">ডাউনলোড করুন</a></div>
            )}
            <div className="flex gap-3 text-sm">
              <a href={`/api/drive/file/${preview.id}`} download className="underline">ডাউনলোড</a>
              <button onClick={() => share(preview.id)} className="underline">শেয়ার লিংক (১ ঘণ্টা)</button>
              <button onClick={() => remove(preview.id)} className="underline text-red-600">ডিলিট</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1">
        <div className="font-semibold">সীমাবদ্ধতা (সৎ তথ্য):</div>
        <div>• প্রতি ফাইল ২GB (ফ্রি) / ৪GB (প্রিমিয়াম) — বড় ফাইল অটো-চাংকড</div>
        <div>• Vercel থেকে ছোট আপলোড; বড় আপলোড VPS (vps.hostamar.com) বা মাইগ্রেশন স্ক্রিপ্ট দিয়ে</div>
        <div>• আপলোড গতি ~৫-১০ MB/s (টেলিগ্রাম ক্লায়েন্ট প্রতি)</div>
        <div>• E2E এনক্রিপ্টেড নয় — সংবেদনশীল ফাইল আপলোডের আগে এনক্রিপ্ট করুন</div>
        <div>• টেলিগ্রাম অ্যাকাউন্ট ব্যান হলে ড্রাইভ বন্ধ — এই সেশন দিয়ে স্প্যাম করবেন না</div>
      </div>
    </div>
  )
}
