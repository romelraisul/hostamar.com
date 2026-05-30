'use client'

import { Play, Clock, Sparkles, Trash2 } from 'lucide-react'

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

export default function PreviewCard({
  preview,
  onDelete,
}: {
  preview: PreviewItem
  onDelete?: (id: string) => void
}) {
  const createdDate = new Date(preview.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all group">
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-gradient-to-br from-purple-900/40 via-gray-800 to-pink-900/40 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-gray-500">AI Preview</p>
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
          <Clock className="w-3 h-3 text-white" />
          <span className="text-xs text-white font-medium">{preview.duration}s</span>
        </div>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(preview.id)
            }}
            className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-white truncate">{preview.title || 'Untitled Preview'}</h4>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{createdDate}</span>
          {preview.videoId && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              Linked
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
