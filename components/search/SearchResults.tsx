'use client'

import { Play, Eye, Clock, Calendar, SearchX, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SearchResultItem {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  url?: string | null
  duration: number
  language: string
  createdAt: string
  customerId: string
  score: number
}

interface SearchResultsProps {
  results: SearchResultItem[]
  query: string
  isSearching: boolean
  hasSearched: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-400'
  if (score >= 0.5) return 'text-yellow-400'
  return 'text-gray-400'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SearchResults({
  results,
  query,
  isSearching,
  hasSearched,
}: SearchResultsProps) {
  // --------------------------------------------------
  // Loading skeleton
  // --------------------------------------------------
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-400" />
        <p className="text-lg font-medium">Searching videos...</p>
        <p className="text-sm text-gray-500 mt-1">
          Generating embeddings and finding matches
        </p>
      </div>
    )
  }

  // --------------------------------------------------
  // No search performed yet
  // --------------------------------------------------
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <SearchX className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Search your video library</p>
        <p className="text-sm text-gray-500 mt-1">
          Type a query above to find videos by semantic similarity
        </p>
      </div>
    )
  }

  // --------------------------------------------------
  // Empty results
  // --------------------------------------------------
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <SearchX className="w-16 h-16 mb-4 opacity-30" />
        <h3 className="text-xl font-bold text-gray-400 mb-2">
          No results found
        </h3>
        <p className="text-sm text-gray-500 max-w-md text-center">
          No videos match &ldquo;{query}&rdquo;. Try a different search term or
          adjust your query.
        </p>
      </div>
    )
  }

  // --------------------------------------------------
  // Results header
  // --------------------------------------------------
  const topScore = results[0].score

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Results for &ldquo;{query}&rdquo;
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {results.length} video{results.length !== 1 ? 's' : ''} found
            &nbsp;·&nbsp; Best match:
            <span className={`ml-1 font-medium ${scoreColor(topScore)}`}>
              {(topScore * 100).toFixed(1)}% similar
            </span>
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((video) => (
          <article
            key={video.id}
            className="group bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all"
          >
            {/* Thumbnail */}
            <a
              href={video.url || '#'}
              target={video.url ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="block relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden"
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/20 group-hover:text-white/40 transition-colors" />
                </div>
              )}

              {/* Duration badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(video.duration)}
              </div>

              {/* Language badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                {video.language}
              </div>

              {/* Similarity badge */}
              <div
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-600/80 text-white`}
              >
                {(video.score * 100).toFixed(0)}% match
              </div>
            </a>

            {/* Details */}
            <div className="p-4">
              <h3 className="text-white font-semibold text-sm mb-1.5 line-clamp-2 group-hover:text-purple-300 transition-colors">
                {video.title}
              </h3>

              {video.description && (
                <p className="text-gray-400 text-xs line-clamp-2 mb-3 leading-relaxed">
                  {video.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(video.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Score:{' '}
                  <span className={`font-medium ${scoreColor(video.score)}`}>
                    {video.score.toFixed(4)}
                  </span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
