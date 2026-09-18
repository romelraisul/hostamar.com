'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { 
  Plus, 
  Video, 
  Play, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  LayoutGrid,
  List,
  X
} from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

interface VideoItem {
  id: string
  title: string
  description: string | null
  topic: string
  status: string
  duration: number
  thumbnailUrl: string | null
  downloads: number
  views: number
  createdAt: string
  url?: string | null
  script?: string | null
}

export default function VideosPage() {
  const { t } = useLocale()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [retrying, setRetrying] = useState<string | null>(null)
  // V29: reel-style preview/export modal per video
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const [exporting, setExporting] = useState(false)
  const [previewMsg, setPreviewMsg] = useState('')

  useEffect(() => {
    fetchVideos()
  }, [])

  // V28: auto-refresh every 10s while any video is processing (or a stuck legacy
  // row exists) — plus a one-time heal sweep for rows stranded by the pre-V28
  // queue design (nothing ever consumed it). Clears "processing forever".
  useEffect(() => {
    if (loading) return
    const anyStuck = videos.some(
      (v) => v.status === 'processing' && Date.now() - new Date(v.createdAt).getTime() > 5 * 60_000,
    )
    if (anyStuck) {
      fetch('/api/videos/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heal: true }),
      })
        .then(() => fetchVideos())
        .catch(() => {})
    }
    const anyProcessing = videos.some((v) => v.status === 'processing')
    if (!anyProcessing) return
    const iv = setInterval(() => fetchVideos(), 10_000)
    return () => clearInterval(iv)
  }, [videos, loading])

  async function retryVideo(videoId: string) {
    setRetrying(videoId)
    try {
      await fetch('/api/videos/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      await fetchVideos()
    } catch (e) {
      console.error('retry failed', e)
    } finally {
      setRetrying(null)
    }
  }

  // V29c: B2 is PRIVATE (customer files) — direct f005 URLs 401 in the
  // browser. Serve through the authorized streaming proxy instead.
  function proxiedUrl(v: VideoItem): string {
    const u = v.url || ''
    const m = u.match(/^https:\/\/[^/]+\/file\/[^/]+\/(.+)$/)
    if (m) return '/api/videos/file/' + m[1]
    return u
  }

  // V29 — parse the inline manifest from the pipeline (script field) for preview
  function getManifest(v: VideoItem): { slides: string[]; captions: string[] } | null {
    try {
      const d = JSON.parse(v.script || '')
      if (d?.manifest && Array.isArray(d.slides)) {
        return { slides: d.slides, captions: Array.isArray(d.captions) ? d.captions : [] }
      }
    } catch { /* not a manifest */ }
    return null
  }

  // V29 — client-side WEBM export (reel pattern) + optional B2 persist
  async function exportVideoWebm(v: VideoItem) {
    const m = getManifest(v)
    if (!m || m.slides.length === 0) {
      setPreviewMsg('ম্যানিফেস্ট নেই — আগে রিট্রাই করুন (pipeline regenerate)')
      return
    }
    setExporting(true)
    setPreviewMsg('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 720
      canvas.height = 1280
      const ctx = canvas.getContext('2d')!
      const slideMs = 3000
      const totalMs = Math.max(6000, m.slides.length * slideMs)

      const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = () => res(im)
        im.src = src
      })
      const slideImgs = await Promise.all(m.slides.map(loadImg))

      const stream = canvas.captureStream(30)
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })) })
      rec.start(200)

      const t0 = performance.now()
      await new Promise<void>((resolve) => {
        const draw = (t: number) => {
          const el = t - t0
          const i = Math.min(m.slides.length - 1, Math.floor(el / slideMs))
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, 720, 1280)
          try { ctx.drawImage(slideImgs[i], 0, 0, 720, 1280) } catch { /* backdrop */ }
          const g = ctx.createLinearGradient(0, 950, 0, 1280)
          g.addColorStop(0, 'rgba(0,0,0,0)')
          g.addColorStop(1, 'rgba(0,0,0,0.8)')
          ctx.fillStyle = g
          ctx.fillRect(0, 950, 720, 330)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 40px "Noto Sans Bengali", "Hind Siliguri", sans-serif'
          ctx.textAlign = 'center'
          ctx.shadowColor = 'rgba(0,0,0,0.9)'
          ctx.shadowBlur = 10
          ctx.fillText(m.captions[i] || v.title, 360, 1150, 640)
          ctx.fillStyle = 'rgba(14,124,58,0.85)'
          ctx.beginPath(); ctx.arc(660, 70, 44, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 44px sans-serif'
          ctx.fillText('H', 660, 86)
          if (el >= totalMs) { resolve(); return }
          requestAnimationFrame(draw)
        }
        requestAnimationFrame(draw)
      })

      rec.stop()
      const blob = await done

      // persist to B2 → video.url becomes a real .webm (non-fatal for the local download)
      let uploaded = false
      try {
        const fd = new FormData()
        fd.append('videoId', v.id)
        fd.append('file', blob, 'export.webm')
        const up = await fetch('/api/videos/upload', { method: 'POST', body: fd })
        if (up.ok) uploaded = true
      } catch { /* local download still works */ }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hostamar-${v.id.slice(0, 8)}-${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      setPreviewMsg(`✓ WEBM ডাউনলোড হয়েছে${uploaded ? ' + B2 আপলোড সম্পন্ন — এখন player-এ চালবে' : ''}`)
      if (uploaded) await fetchVideos()
    } catch (e: any) {
      setPreviewMsg('এক্সপোর্ট ব্যর্থ: ' + String(e?.message || e).slice(0, 120))
    } finally {
      setExporting(false)
    }
  }

  async function fetchVideos() {
    try {
      const res = await fetch('/api/dashboard/videos')
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos)
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(videoId: string) {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/dashboard/videos?id=${videoId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId))
        setDeleteConfirm(null)
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete video')
      }
    } catch {
      setDeleteError('Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || video.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse'
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-#0E7C3A" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('dashVideos.title')}</h1>
          <p className="text-gray-500 mt-1">{t('dashVideos.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E7C3A] text-white rounded-lg hover:bg-[#0A5A2B] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dashVideos.create')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('dashVideos.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A]"
          >
            <option value="all">{t('dashVideos.allStatus')}</option>
            <option value="ready">{t('dashVideos.ready')}</option>
            <option value="processing">{t('dashVideos.processing')}</option>
            <option value="failed">{t('dashVideos.failed')}</option>
          </select>
          <div className="border-l pl-2 ml-2 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#0E7C3A]/10 text-[#0E7C3A]' : 'text-gray-400 hover:text-gray-600'
              }`}
              title={t('dashVideos.gridView')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-[#0E7C3A]/10 text-[#0E7C3A]' : 'text-gray-400 hover:text-gray-600'
              }`}
              title={t('dashVideos.tableView')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('dashVideos.deleteTitle')}</h2>
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              {t('dashVideos.deleteConfirm')}
            </p>
            {deleteError && (
              <p className="text-red-500 text-sm mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError('') }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? t('dashVideos.deleting') : t('dashVideos.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredVideos.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div key={video.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow group">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
                    {formatDuration(video.duration)}
                  </div>
                  {video.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(video.status)}`}
                    >
                      {video.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {video.description || video.topic}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span>{video.views} {t('dashVideos.views')}</span>
                      <span>{video.downloads} {t('dashVideos.downloads')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    {(video.status === 'ready' || video.status === 'completed') && (
                      <>
                        <button
                          onClick={() => { setPreviewVideo(video); setPreviewMsg('') }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[#0E7C3A]/10 text-[#0E7C3A] rounded-lg hover:bg-[#0E7C3A]/10 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          {t('dashVideos.play')}
                        </button>
                        {(video.url && /\.(webm|mp4)(\?|$)/i.test(video.url)) ? (
                          <a href={proxiedUrl(video)} download className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <Download className="w-4 h-4" />
                            {t('dashVideos.download')}
                          </a>
                        ) : (
                          <button
                            onClick={() => exportVideoWebm(video)}
                            disabled={exporting}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                          >
                            <Download className="w-4 h-4" />
                            {exporting ? 'রেকর্ডিং…' : t('dashVideos.download')}
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(video.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('dashVideos.deleteVideo')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {(video.status === 'processing' || video.status === 'failed') && (
                      <button
                        onClick={() => retryVideo(video.id)}
                        disabled={retrying === video.id}
                        className="p-2 text-gray-400 hover:text-[#0E7C3A] hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                        title="আবার চালান (retry pipeline)"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6M23 20v-6h-6" />
                          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">{t('dashVideos.title')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">স্ট্যাটাস</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">সময়কাল</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">ভিউ</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">ডাউনলোড</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">তৈরি হয়েছে</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">ক্রিয়া</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{video.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{video.topic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(video.status)}`}
                        >
                          {video.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDuration(video.duration)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{video.views}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{video.downloads}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {(video.status === 'ready' || video.status === 'completed') && (
                            <>
                              <button
                                onClick={() => { setPreviewVideo(video); setPreviewMsg('') }}
                                className="p-2 text-[#0E7C3A] hover:bg-[#0E7C3A]/10 rounded-lg transition-colors"
                                title="প্রিভিউ ও প্লেয়ার"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              {(video.url && /\.(webm|mp4)(\?|$)/i.test(video.url)) ? (
                                <a href={proxiedUrl(video)} download className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title={t('dashVideos.download')}>
                                  <Download className="w-4 h-4" />
                                </a>
                              ) : (
                                <button
                                  onClick={() => exportVideoWebm(video)}
                                  disabled={exporting}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                  title="WEBM এক্সপোর্ট + ডাউনলোড"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(video.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('dashVideos.deleteVideo')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border p-12 text-center">
          <Video className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashVideos.noVideos')}</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterStatus !== 'all'
              ? t('dashVideos.adjustFilters')
              : t('dashVideos.createFirst')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E7C3A] text-white rounded-lg hover:bg-[#0A5A2B]"
          >
            <Plus className="w-4 h-4" />
            {t('dashVideos.create')}
          </button>
        </div>
      )}

      {/* V29: reel-style preview + export modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 line-clamp-1">{previewVideo.title}</h3>
              <button className="p-1 text-gray-400 hover:text-gray-600" onClick={() => setPreviewVideo(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewVideo.url && /\.(webm|mp4)(\?|$)/i.test(previewVideo.url) ? (
              /* Real video file (B2 webm/mp4) — native player */
              <video controls src={proxiedUrl(previewVideo)} className="w-full aspect-[9/16] bg-black rounded-xl" />
            ) : (() => {
              const m = getManifest(previewVideo)
              if (!m) {
                return (
                  <div className="text-sm text-gray-500 p-4 text-center">
                    ম্যানিফেস্ট নেই — <button className="text-[#0E7C3A] underline" onClick={() => retryVideo(previewVideo.id)}>রিট্রাই</button> করে pipeline আবার চালান
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  <div className="relative w-full aspect-[9/16] bg-[#0a0a0a] rounded-xl overflow-hidden">
                    <img src={m.slides[0]} alt="slide" className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                    <p className="absolute bottom-4 inset-x-4 text-white text-sm text-center font-medium" style={{ fontFamily: 'Noto Sans Bengali, Hind Siliguri, sans-serif' }}>
                      {m.captions[0] || previewVideo.title}
                    </p>
                    <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#0E7C3A]/85 flex items-center justify-center text-white font-bold">H</div>
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-white text-xs">
                      ১/{m.slides.length} স্লাইড · ৩ সে/স্লাইড
                    </div>
                  </div>
                  <button
                    onClick={() => exportVideoWebm(previewVideo)}
                    disabled={exporting}
                    className="w-full py-3 bg-[#0E7C3A] text-white rounded-xl font-medium disabled:opacity-40 hover:bg-[#0b6b31] transition-colors"
                  >
                    {exporting ? 'এক্সপোর্ট হচ্ছে… (রেকর্ডিং ১২ সেকেন্ড)' : 'প্রিভিউ ও এক্সপোর্ট WEBM'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    স্লাইডগুলো canvas-এ রেন্ডার হয়ে MediaRecorder দিয়ে WEBM বানে (V25 রিল প্যাটার্ন) — তারপর B2-তে আপলোড হলে player-এ সরাসরি চালবে।
                  </p>
                </div>
              )
            })()}

            {previewMsg && <p className="mt-3 text-sm text-gray-700 text-center">{previewMsg}</p>}

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-gray-400">ম্যানুয়াল পাবলিশ: মার্কেটিং মডিউল (/dashboard/marketing)</span>
              <a href="/dashboard/marketing" className="text-xs text-[#0E7C3A] underline">যান</a>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateVideoModal onClose={() => setShowCreateModal(false)} onCreated={fetchVideos} />
      )}
    </div>
  )
}

function CreateVideoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useLocale()
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    description: '',
    language: 'bn',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/dashboard/videos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        onCreated()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create video')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('dashVideos.createNewTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashVideos.videoTitle')}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A]"
              placeholder={t('dashVideos.videoTitlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashVideos.topic')}
            </label>
            <input
              type="text"
              required
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A]"
              placeholder={t('dashVideos.topicPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashVideos.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A]"
              rows={3}
              placeholder={t('dashVideos.descriptionPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('dashVideos.language')}
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0E7C3A]"
            >
              <option value="bn">{t('dashVideos.bengali')}</option>
              <option value="en">{t('dashVideos.english')}</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0E7C3A] text-white rounded-lg hover:bg-[#0A5A2B] disabled:opacity-50"
            >
              {loading ? t('dashVideos.creating') : t('dashVideos.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
