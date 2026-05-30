'use client'

import { useState, useEffect } from 'react'
import PreviewGenerator from '@/components/previews/PreviewGenerator'
import PreviewCard from '@/components/previews/PreviewCard'
import { Loader2, Search } from 'lucide-react'

interface PreviewItem {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  duration: number
  prompt: string
  videoId: string | null
  createdAt: string
}

export default function PreviewsClient() {
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/previews/generate')
      .then(r => r.json())
      .then(data => {
        setPreviews(data.previews || [])
      })
      .catch(() => setPreviews([]))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const filteredPreviews = previews.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleGenerated() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-8">
      {/* Generator */}
      <PreviewGenerator onGenerated={handleGenerated} />

      {/* Previews gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Generated Previews ({filteredPreviews.length})
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previews..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : filteredPreviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No previews match your search.' : 'No previews yet. Generate one above!'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPreviews.map((p) => (
              <PreviewCard key={p.id} preview={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
