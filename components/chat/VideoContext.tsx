'use client'

import { useState, useEffect } from 'react'
import { Film, Loader2 } from 'lucide-react'

interface VideoItem {
  id: string
  title: string
  status: string
  language: string
  url?: string
  thumbnailUrl?: string
}

interface VideoContextProps {
  selectedVideoId: string | null
  onSelectVideo: (id: string | null, title: string) => void
}

export default function VideoContext({ selectedVideoId, onSelectVideo }: VideoContextProps) {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/videos')
      .then(r => r.json())
      .then(data => {
        setVideos(Array.isArray(data.videos || data) ? data.videos || data : [])
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  const selectedVideo = videos.find(v => v.id === selectedVideoId)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-medium text-white">Video Context</h3>
        </div>
      </div>

      <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
          </div>
        ) : videos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No videos yet</div>
        ) : (
          <>
            <button
              onClick={() => onSelectVideo('', '')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                selectedVideoId === '' || selectedVideoId === null ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'
              }`}
            >
              General Chat (no specific video)
            </button>
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelectVideo(v.id, v.title)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
                  selectedVideoId === v.id ? 'bg-blue-500/10 border-l-2 border-blue-400' : ''
                }`}
              >
                <p className="text-sm font-medium text-white truncate">{v.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{v.status}</span>
                  <span className="text-xs text-gray-500">{v.language}</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
