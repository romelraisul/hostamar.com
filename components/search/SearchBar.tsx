'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, TrendingUp, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SearchSuggestion {
  text: string
  type: 'recent' | 'trending' | 'suggestion'
}

interface SearchBarProps {
  onSearch: (query: string) => void
  onClear?: () => void
  initialQuery?: string
  placeholder?: string
  isSearching?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RECENT_SEARCHES_KEY = 'hostamar_recent_searches'
const MAX_RECENT = 6

const TRENDING: SearchSuggestion[] = [
  { text: 'product demo video', type: 'trending' },
  { text: 'social media ad', type: 'trending' },
  { text: 'marketing video bangla', type: 'trending' },
  { text: 'business promotion', type: 'trending' },
  { text: 'ecommerce explainer', type: 'trending' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadRecent(): SearchSuggestion[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_RECENT).map((t: string) => ({
      text: t,
      type: 'recent' as const,
    }))
  } catch {
    return []
  }
}

function saveRecent(query: string) {
  try {
    const existing = loadRecent().map((s) => s.text)
    const updated = [query, ...existing.filter((t) => t !== query)].slice(
      0,
      MAX_RECENT,
    )
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // localStorage may be disabled — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SearchBar({
  onSearch,
  onClear,
  initialQuery = '',
  placeholder = 'Search videos by title, description, or topic...',
  isSearching = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(loadRecent())
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [recentSearches, query])

  // -----------------------------------------------------------------------
  // Derived suggestion list
  // -----------------------------------------------------------------------
  const suggestions = useCallback((): SearchSuggestion[] => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) {
      // Show recents + trending when input is empty
      const recent = recentSearches
      const trending = TRENDING.filter(
        (t) => !recent.some((r) => r.text === t.text),
      )
      return [...recent, ...trending]
    }

    // Filter from trending & recents
    const fromRecent = recentSearches.filter((s) =>
      s.text.toLowerCase().includes(trimmed),
    )
    const fromTrending = TRENDING.filter(
      (t) =>
        t.text.toLowerCase().includes(trimmed) &&
        !fromRecent.some((r) => r.text === t.text),
    )
    return [...fromRecent, ...fromTrending]
  }, [query, recentSearches])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    saveRecent(trimmed)
    setRecentSearches(loadRecent())
    setShowDropdown(false)
    setActiveIndex(-1)
    onSearch(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = suggestions()
    if (!showDropdown || list.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(query)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < list.length) {
          handleSubmit(list[activeIndex].text)
        } else {
          handleSubmit(query)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setActiveIndex(-1)
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setShowDropdown(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
    onClear?.()
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const dropdownItems = showDropdown ? suggestions() : []

  return (
    <div className="relative w-full">
      {/* Input wrapper */}
      <div
        className={`relative flex items-center w-full rounded-2xl border bg-white/5 backdrop-blur-md transition-all ${
          showDropdown
            ? 'border-purple-500/50 ring-2 ring-purple-500/20'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="pl-4 pr-2 text-gray-400">
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!showDropdown) setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-3.5 pr-2 text-white placeholder-gray-500 outline-none text-base"
          aria-label="Search videos"
          autoComplete="off"
        />

        {query && (
          <button
            onClick={handleClear}
            className="mr-3 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {dropdownItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-purple-500/5 overflow-hidden z-50"
        >
          {/* Header */}
          {!query.trim() && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending & Recent</span>
            </div>
          )}

          {/* Items */}
          {dropdownItems.map((item, idx) => (
            <button
              key={`${item.type}-${item.text}`}
              onMouseDown={(e) => {
                e.preventDefault() // prevent blur
                handleSubmit(item.text)
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition ${
                idx === activeIndex
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className="text-gray-500 text-xs w-4 text-center shrink-0">
                {item.type === 'trending' ? '🔥' : '🕐'}
              </span>
              <span className="truncate">{item.text}</span>
              {item.type === 'recent' && (
                <span className="ml-auto text-[10px] text-gray-600 shrink-0">
                  recent
                </span>
              )}
            </button>
          ))}

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-600 border-t border-white/5">
            <span>↑↓ navigate &nbsp;·&nbsp; ↵ select</span>
            {query.trim() && dropdownItems.length > 0 && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSubmit(query)
                }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Search &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
