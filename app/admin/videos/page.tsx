import { prisma } from '@/lib/prisma'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const OUTPUT_DIR = '/home/romel/ComfyUI/output'

export default async function AdminVideos() {
  let videos: any[] = []
  let dbError: string | null = null
  try {
    videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { customer: { select: { email: true, name: true } } },
    })
  } catch (e: any) {
    dbError = e?.message || 'DB failed'
  }

  let queue = { running: 0, pending: 0, history: 0 }
  let files: string[] = []
  try {
    const [q, h] = await Promise.all([
      fetch('http://127.0.0.1:8188/queue', { cache: 'no-store' }).then((r) => r.json()),
      fetch('http://127.0.0.1:8188/history', { cache: 'no-store' }).then((r) => r.json()),
    ])
    queue = { running: q.queue_running?.length || 0, pending: q.queue_pending?.length || 0, history: Object.keys(h).length }
  } catch {}
  try {
    files = fs.readdirSync(OUTPUT_DIR).filter((f: string) => f.endsWith('.mp4') || f.endsWith('.png')).slice(-20)
  } catch {}

  // V87: real failure reason per row (VideoQueue.renderError — the worker's
  // honest error, e.g. "upload/complete 413" from the 2026-09-26 retry loop).
  let qErrs: Record<string, string> = {}
  try {
    const qrows = await prisma.videoQueue.findMany({
      where: { error: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { videoId: true, error: true, renderError: true },
    })
    for (const q of qrows) {
      if (q.videoId && !qErrs[q.videoId]) qErrs[q.videoId] = (q.renderError || q.error || '').slice(0, 300)
    }
  } catch {}

  return (
    <div className="min-h-screen bg-[#fffdf6] p-6 text-black">
      <div className="flex justify-between items-start gap-4">
        <h1 className="text-2xl font-bold">ভিডিও Tab — Customer Video Management</h1>
        <a href="/admin/videos/reference-copy" className="text-xs underline text-blue-700">H3 ReferenceToVideo নকল — video copy local unlimited →</a>
        <div className="text-xs bg-white border p-2 rounded max-w-md">
          ComfyUI :8188 running {queue.running} pending {queue.pending} history {queue.history} · WSL ~/ComfyUI/output ({files.length} files) · Prisma sqlite/Turso
        </div>
      </div>
      {dbError && <p className="mt-3 text-sm text-red-600 border border-red-300 bg-white rounded p-2">DB error: {dbError}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4">
        {videos.map((v: any) => (
          <div key={v.id} className="border-2 border-[#0E7C3A]/30 bg-white rounded p-4">
            <div className="flex justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">
                  {v.title} — {v.status} — {Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')} — {v.views} view {v.downloads} download — {new Date(v.createdAt).toLocaleDateString()} — {v.customer?.email}
                </p>
                <div className="mt-2 grid md:grid-cols-2 gap-3 text-xs">
                  <div className="border p-2 rounded">
                    <p className="font-bold">PROMPT</p>
                    <p className="mt-1 whitespace-pre-wrap">{v.prompt || v.description?.slice(0, 500) || '—'}</p>
                  </div>
                  <div className="border p-2 rounded">
                    <p className="font-bold">CONTENT / SCRIPT (+support material)</p>
                    <p className="mt-1 whitespace-pre-wrap">{v.script || '—'}</p>
                  </div>
                  <div className="border p-2 rounded">
                    <p className="font-bold">IMAGE</p>
                    {v.thumbnailUrl ? (
                      <img src={`/api/video/file?path=${encodeURIComponent(v.thumbnailUrl)}`} className="mt-1 max-h-40 border" alt="thumb" />
                    ) : (
                      <p className="mt-1 text-gray-500">—</p>
                    )}
                    <p className="text-gray-500 mt-1 break-all">{v.thumbnailUrl || ''}</p>
                  </div>
                  <div className="border p-2 rounded">
                    <p className="font-bold">VIDEO — Hunyuan 720p (WSL)</p>
                    {v.url ? (
                      <video src={`/api/video/file?path=${encodeURIComponent(v.url)}`} controls className="mt-1 max-h-40 border w-full" />
                    ) : (
                      <p className="mt-1 text-gray-500">not rendered yet</p>
                    )}
                    <p className="text-gray-500 mt-1 break-all">{v.url || ''} {v.fileSize ? `${(v.fileSize / 1000).toFixed(0)}K` : ''} {v.format} {v.resolution}</p>
                  </div>
                </div>
              </div>
              <div className="ml-2 flex flex-col gap-2 shrink-0">
                {qErrs[v.id] && (
                  <p className="text-xs text-red-700 border border-red-300 bg-red-50 rounded p-2 max-w-xs break-all">ERROR: {qErrs[v.id]}</p>
                )}
                {(v.status === 'failed' || v.status === 'processing') && (
                  <form action="/api/admin/videos/retry" method="POST">
                    <input type="hidden" name="videoId" value={v.id} />
                    <button type="submit" className="text-xs border px-3 py-1 rounded bg-[#0E7C3A] text-white w-full">Retry</button>
                  </form>
                )}
                <a href={`/api/video/logs?videoId=${v.id}`} className="text-xs border px-3 py-1 rounded bg-white text-center">Logs :8188</a>
                {v.url && (
                  <a href={`/api/video/file?path=${encodeURIComponent(v.url)}&download=1`} className="text-xs border px-3 py-1 rounded bg-white text-center">Download</a>
                )}
              </div>
            </div>
          </div>
        ))}
        {!videos.length && !dbError && <p className="text-sm text-gray-500">No videos in DB yet.</p>}
      </div>
    </div>
  )
}
