'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import SearchBar from '@/components/search/SearchBar'
import SearchResults, { SearchResultItem } from '@/components/search/SearchResults'

export default function SearchPage() {
  const { t } = useLocale()
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
      

      {/* Results area */}
      <section className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <span className="text-red-400 text-2xl font-bold">!</span>
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">
              {t('search.failed')}
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
      
    </main>
  )
}
