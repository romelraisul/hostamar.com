'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import SearchBar from '@/components/search/SearchBar'
import SearchResults, { SearchResultItem } from '@/components/search/SearchResults'

export default function SearchPage() {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // -------------------------------------------------------------------
  // Search handler
  // -------------------------------------------------------------------
  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return

    setQuery(trimmed)
    setIsSearching(true)
    setHasSearched(true)
    setError(null)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(
          (errData as any).error || `Server error (${res.status})`,
        )
      }

      const data = await res.json()
      setResults((data as any).results ?? [])
    } catch (err: any) {
      console.error('[search-page] Search failed:', err.message)
      setError(err.message)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Video Search
              </h1>
              <p className="text-xs text-gray-500">
                Semantic search powered by Ollama embeddings
              </p>
            </div>
          </div>

          <SearchBar
            onSearch={handleSearch}
            onClear={() => {
              setResults([])
              setHasSearched(false)
              setError(null)
              setQuery('')
            }}
            isSearching={isSearching}
            initialQuery={query}
          />
        </div>
      </header>

      {/* Results area */}
      <section className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <span className="text-red-400 text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">
              Search Failed
            </h3>
            <p className="text-sm text-gray-500 max-w-md text-center mb-6">
              {error}
            </p>
            <p className="text-xs text-gray-600 max-w-md text-center">
              Make sure Ollama is running on port 11435 with the{' '}
              <code className="text-purple-400 bg-purple-500/10 px-1 rounded">
                hermes3:latest
              </code>{' '}
              model loaded.
            </p>
          </div>
        ) : (
          <SearchResults
            results={results}
            query={query}
            isSearching={isSearching}
            hasSearched={hasSearched}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-xl border-t border-white/5 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-gray-600">
          <span>
            Powered by{' '}
            <span className="text-purple-400">Ollama · hermes3:latest</span>
          </span>
          <span>Semantic cosine similarity search</span>
        </div>
      </footer>
    </main>
  )
}
