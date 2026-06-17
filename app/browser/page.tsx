'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Globe, Brain, Languages, Copy, Share2, Check, X, Trash2,
  Clock, BookmarkPlus, Bookmark, Search, ArrowLeft, ExternalLink,
  Sparkles, ChevronDown, History, Star, Loader2, AlertCircle,
  RefreshCw, Sun, Moon, ArrowRightLeft
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  url: string
  title: string
  result: string
  lang: string
  task: string
  timestamp: number
  summaryEn?: string
}

interface BookmarkEntry {
  id: string
  url: string
  title: string
  note: string
  timestamp: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function validateUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrowserPage() {
  const [url, setUrl] = useState('')
  const [task, setTask] = useState<'summarize' | 'translate'>('summarize')
  const [lang, setLang] = useState<'english' | 'bangla'>('bangla')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [summaryEn, setSummaryEn] = useState('')
  const [error, setError] = useState('')
  const [charsProcessed, setCharsProcessed] = useState(0)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const h = localStorage.getItem('browser_history')
      const b = localStorage.getItem('browser_bookmarks')
      if (h) setHistory(JSON.parse(h))
      if (b) setBookmarks(JSON.parse(b))
    } catch {}
  }, [])

  // Auto-focus
  useEffect(() => { inputRef.current?.focus() }, [])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    const finalUrl = url.startsWith('http') ? url : `https://${url}`
    if (!validateUrl(finalUrl)) {
      setError('Please enter a valid URL')
      return
    }

    setLoading(true)
    setError('')
    setResult('')
    setSummaryEn('')

    try {
      const res = await fetch('/api/browser/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, lang, task }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setResult(data.result)
      setSummaryEn(data.summaryEn || '')
      setCharsProcessed(data.charsProcessed || 0)

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        url: finalUrl,
        title: extractDomain(finalUrl),
        result: data.result,
        lang,
        task,
        timestamp: Date.now(),
        summaryEn: data.summaryEn,
      }
      const updated = [entry, ...history.filter(h => h.url !== finalUrl).slice(0, 49)]
      setHistory(updated)
      localStorage.setItem('browser_history', JSON.stringify(updated))
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleHistoryClick(entry: HistoryEntry) {
    setUrl(entry.url)
    setLang(entry.lang as 'english' | 'bangla')
    setTask(entry.task as 'summarize' | 'translate')
    setResult(entry.result)
    setSummaryEn(entry.summaryEn || '')
    setShowHistory(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(result).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = result
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `AI Summary: ${extractDomain(url)}`, text: result, url })
      } else {
        handleCopy()
      }
    } catch {}
  }

  function handleBookmark() {
    const entry: BookmarkEntry = {
      id: Date.now().toString(),
      url: url.startsWith('http') ? url : `https://${url}`,
      title: extractDomain(url),
      note: result.slice(0, 80),
      timestamp: Date.now(),
    }
    setBookmarks(prev => {
      const updated = [entry, ...prev.filter(b => b.url !== entry.url)]
      localStorage.setItem('browser_bookmarks', JSON.stringify(updated))
      return updated
    })
  }

  function deleteHistoryItem(id: string) {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id)
      localStorage.setItem('browser_history', JSON.stringify(updated))
      return updated
    })
  }

  function deleteBookmark(id: string) {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.id !== id)
      localStorage.setItem('browser_bookmarks', JSON.stringify(updated))
      return updated
    })
  }

  function clearHistory() {
    setHistory([])
    localStorage.removeItem('browser_history')
  }

  function clearAll() {
    setResult('')
    setError('')
    setSummaryEn('')
    setUrl('')
    setCharsProcessed(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 via-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">AI Browser</h1>
              <p className="text-xs text-gray-500">Summarize & Translate any page</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History Toggle */}
            <button
              onClick={() => { setShowHistory(v => !v); setShowBookmarks(false) }}
              className={`relative p-2 rounded-lg transition ${showHistory ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <History className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </button>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => { setShowBookmarks(v => !v); setShowHistory(false) }}
              className={`relative p-2 rounded-lg transition ${showBookmarks ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Bookmark className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {bookmarks.length > 9 ? '9+' : bookmarks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto">

        {/* ── Sidebar: History / Bookmarks ───────────────────────────────── */}
        {(showHistory || showBookmarks) && (
          <aside className="w-80 shrink-0 border-r border-white/5 bg-gray-950/50 h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
            {showHistory && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <History className="w-4 h-4" /> History
                  </h2>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 transition">
                      Clear all
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No history yet</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(entry => (
                      <div key={entry.id} className="group relative bg-white/5 hover:bg-white/10 rounded-xl p-3 transition cursor-pointer" onClick={() => handleHistoryClick(entry)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{entry.title}</div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">{entry.url}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                entry.lang === 'bangla' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {entry.lang === 'bangla' ? 'বাংলা' : 'EN'}
                              </span>
                              <span className="text-[10px] text-gray-500">{entry.task === 'summarize' ? 'Summary' : 'Translation'}</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-600 shrink-0">{timeAgo(entry.timestamp)}</div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1.5 line-clamp-2">{entry.result}</div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteHistoryItem(entry.id) }}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showBookmarks && (
              <div className="p-4">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-400" /> Bookmarks
                </h2>

                {bookmarks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No bookmarks yet</p>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map(bm => (
                      <div key={bm.id} className="group relative bg-white/5 hover:bg-white/10 rounded-xl p-3 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{bm.title}</div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">{bm.url}</div>
                            <div className="text-xs text-gray-400 mt-1.5 line-clamp-2">{bm.note}...</div>
                          </div>
                          <button
                            onClick={() => {
                              setUrl(bm.url)
                              setResult(bm.note)
                              setShowBookmarks(false)
                            }}
                            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                        <button
                          onClick={() => deleteBookmark(bm.id)}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">

          {/* URL Input Section */}
          <div className="p-4 lg:p-6 pb-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Task Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                  {[
                    { id: 'summarize' as const, label: 'Summarize', icon: <Brain className="w-3.5 h-3.5" /> },
                    { id: 'translate' as const, label: 'Translate', icon: <Languages className="w-3.5 h-3.5" /> },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTask(t.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        task === t.id
                          ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                {/* Language Toggle */}
                <div className="relative ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowLangMenu(v => !v)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition"
                  >
                    <Globe className="w-4 h-4 text-green-400" />
                    {lang === 'bangla' ? 'বাংলা' : 'English'}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
                      {[
                        { id: 'bangla' as const, label: 'বাংলা (Bangla)', flag: '🇧🇩' },
                        { id: 'english' as const, label: 'English', flag: '🇬🇧' },
                      ].map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => { setLang(l.id); setShowLangMenu(false) }}
                          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/10 transition ${
                            lang === l.id ? 'text-green-400 bg-green-500/10' : 'text-white'
                          }`}
                        >
                          <span>{l.flag}</span> {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* URL Input */}
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="Enter any URL to summarize or translate..."
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition text-base"
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => { setUrl(''); setError(''); setResult('') }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 hover:from-green-600 hover:via-cyan-600 hover:to-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI is analyzing the page...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {task === 'summarize'
                      ? lang === 'bangla' ? 'বাংলায় সারাংশ দেখুন' : 'Summarize in English'
                      : lang === 'bangla' ? 'বাংলায় অনুবাদ করুন' : 'Translate to English'
                    }
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Section */}
          {(result || loading) && (
            <div className="p-4 lg:p-6 space-y-4">

              {/* Loading Skeleton */}
              {loading && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-white/5 rounded animate-pulse mt-1" />
                    </div>
                  </div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${85 - i * 5}%` }} />
                  ))}
                  <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: '60%' }} />
                </div>
              )}

              {/* Result Card */}
              {result && !loading && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  {/* Result Header */}
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {task === 'summarize' ? (lang === 'bangla' ? 'পাতার বাংলা সারাংশ' : 'English Summary') : (lang === 'bangla' ? 'বাংলা অনুবাদ' : 'English Translation')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {extractDomain(url)} · {charsProcessed.toLocaleString()} chars processed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Bookmark */}
                      <button
                        onClick={handleBookmark}
                        className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-yellow-400"
                        title="Bookmark"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                      </button>
                      {/* Copy */}
                      <button
                        onClick={handleCopy}
                        className={`p-2 hover:bg-white/10 rounded-lg transition ${copied ? 'text-green-400' : 'text-gray-400'}`}
                        title="Copy"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      {/* Share */}
                      <button
                        onClick={handleShare}
                        className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-blue-400"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {/* Clear */}
                      <button
                        onClick={clearAll}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition text-gray-400 hover:text-red-400"
                        title="Clear"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Result Body */}
                  <div className="p-5">
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap text-base">
                      {result}
                    </p>

                    {/* English summary shown if Bangla was requested */}
                    {summaryEn && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400 transition list-none flex items-center gap-1">
                            <span>Show English original</span>
                            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="mt-2 text-white/60 leading-relaxed whitespace-pre-wrap text-sm">
                            {summaryEn}
                          </p>
                        </details>
                      </div>
                    )}
                  </div>

                  {/* Result Footer */}
                  <div className="px-5 py-3 border-t border-white/5 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Generated just now
                    </div>
                    <div className="text-xs text-gray-600">·</div>
                    <div className="text-xs text-gray-500">
                      {lang === 'bangla' ? 'বাংলা' : 'English'} output
                    </div>
                    <div className="ml-auto text-xs text-gray-600">
                      AI-powered by Replicate
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              {!result && !loading && (
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  {[
                    { icon: <Brain className="w-5 h-5" />, title: 'Smart Summarize', desc: 'Get the key points of any article in seconds', color: 'from-green-500 to-cyan-500' },
                    { icon: <Languages className="w-5 h-5" />, title: 'Full Page Translate', desc: 'Translate entire webpages to Bangla or English', color: 'from-blue-500 to-purple-500' },
                    { icon: <Bookmark className="w-5 h-5" />, title: 'Save & Revisit', desc: 'Bookmark summaries to read later, anytime', color: 'from-yellow-500 to-orange-500' },
                  ].map((tip, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                      <div className={`w-10 h-10 bg-gradient-to-br ${tip.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <div className="text-white">{tip.icon}</div>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{tip.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{tip.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state - show when no URL entered */}
          {!result && !loading && (
            <div className="p-4 lg:p-6 mt-2">
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-10 h-10 text-green-400/70" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">AI-Powered Web Intelligence</h2>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Enter any URL above to get an instant AI-generated summary or full-page translation — powered by BART + NLLB-200.
                </p>
              </div>

              {/* Example URLs */}
              <div className="mt-8">
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Try these examples</p>
                <div className="space-y-2">
                  {[
                    { url: 'https://en.wikipedia.org/wiki/Bangladesh', label: 'Bangladesh — Wikipedia' },
                    { url: 'https://www.bbc.com/news', label: 'BBC News' },
                    { url: 'https://github.com', label: 'GitHub' },
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setUrl(ex.url)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition text-left group"
                    >
                      <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition">{ex.label}</span>
                      <span className="text-xs text-gray-600 ml-auto font-mono truncate max-w-48">{ex.url}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
