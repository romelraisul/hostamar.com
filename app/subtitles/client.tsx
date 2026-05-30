'use client'

import { useState, useEffect } from 'react'
import SubtitleGenerator from '@/components/subtitles/SubtitleGenerator'
import SubtitleDisplay from '@/components/subtitles/SubtitleDisplay'
import { Search, Loader2 } from 'lucide-react'

interface SubtitleData {
  id: string
  videoId: string
  language: string
  content: string
  timestamps: { start: number; end: number; text: string }[]
  createdAt: string
}

interface VideoItem {
  id: string
  title: string
  status: string
  language: string
  createdAt: string
}

export default function SubtitlesPageClient() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('')
  const [generatedSubtitle, setGeneratedSubtitle] = useState<SubtitleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/videos')
      .then(r => r.json())
      .then(data => {
        const list = data.videos || data || []
        setVideos(Array.isArray(list) ? list : [])
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredVideos = videos.filter(v =>
    v.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedVideo = videos.find(v => v.id === selectedVideoId)

  async function handleSubtitleGenerated(subtitle: SubtitleData) {
    setGeneratedSubtitle(subtitle)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Video list */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading videos...
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {searchQuery ? 'No videos match your search.' : 'No videos yet. Create one first!'}
            </div>
          ) : (
            filteredVideos.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVideoId(v.id)
                  setSelectedVideoTitle(v.title)
                  setGeneratedSubtitle(null)
                }}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/5 ${
                  selectedVideoId === v.id ? 'bg-blue-500/10 border-l-2 border-blue-400' : ''
                }`}
              >
                <p className="text-sm font-medium text-white truncate">{v.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{v.language}</span>
                  <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Generator + Display */}
      <div className="lg:col-span-2 space-y-6">
        {selectedVideoId ? (
          <>
            <SubtitleGenerator
              videoId={selectedVideoId}
              videoTitle={selectedVideoTitle}
              onGenerated={handleSubtitleGenerated}
            />

            {generatedSubtitle && (
              <SubtitleDisplay
                subtitle={generatedSubtitle}
                videoTitle={selectedVideoTitle}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <SubtitlesIcon className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a Video</h3>
            <p className="text-gray-500 max-w-md">
              Choose a video from the list to generate AI-powered subtitles in Bengali or English.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SubtitlesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 13h4m-4 4h7m6-7v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h1m2 4h10M14 4v4m-4 4v4" />
    </svg>
  )
}
