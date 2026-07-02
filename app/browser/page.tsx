'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Search,
  Brain,
  FileText,
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  BookMarked,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

type HistoryItem = {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
};

const CAMOFOX_BASE = 'http://localhost:4000';

export default function BrowserPage() {
  const { t } = useLocale();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [summary, setSummary] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'home' | 'browser' | 'search'>('home');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-browser-history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const persistHistory = (items: HistoryItem[]) => {
    setHistory(items);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-browser-history', JSON.stringify(items));
    }
  };

  const normalizeUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  const saveToHistory = (currentUrl: string, title: string) => {
    try {
      const u = new URL(currentUrl);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        url: u.href,
        title: title || u.href,
        visitedAt: Date.now(),
      };
      persistHistory([item, ...history].slice(0, 100));
    } catch {}
  };

  const handleNavigate = async (targetUrl?: string) => {
    const raw = (targetUrl ?? url).trim();
    if (!raw) return;
    const next = normalizeUrl(raw);
    setError('');
    setSummary('');
    setScreenshotUrl('');
    setView('browser');
    setLoading(true);
    setUrl(next);
    try {
      new URL(next);
    } catch {
      setError('Invalid URL. Example: example.com or https://example.com');
      setLoading(false);
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    saveToHistory(next, '');
  };

  const handleSummarize = async () => {
    if (!url) return;
    setLoadingSummary(true);
    setSummary('');
    setError('');
    try {
      let pageText = '';
      try {
        const res = await fetch(url, { mode: 'no-cors' as RequestMode });
        pageText = `Page at ${url} content could not be fetched directly due CORS/browser policy. Summarize based on common knowledge about the URL when possible.`;
      } catch {
        pageText = `Page content at ${url}. User wants concise summary with key bullets.`;
      }
      const prompt = `Summarize this web page content in 5-8 bullet points: ${url}\n\n${pageText}`;
      const chatRes = await fetch('/api/chat/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      if (!chatRes.ok) throw new Error('AI summary failed');
      const data = await chatRes.json();
      setSummary(data?.content || data?.reply || 'Summary generated.');
    } catch (e: any) {
      setError(e?.message || 'Summarization failed');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleScreenshot = async () => {
    if (!url) return;
    setLoadingScreenshot(true);
    setScreenshotUrl('');
    setError('');
    try {
      const res = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Screenshot failed');
      if (data?.screenshotUrl) {
        setScreenshotUrl(data.screenshotUrl);
      } else if (data?.image) {
        setScreenshotUrl(`data:image/png;base64,${data.image}`);
      } else {
        throw new Error('No screenshot returned');
      }
    } catch (e: any) {
      setError(e?.message || 'Screenshot failed');
    } finally {
      setLoadingScreenshot(false);
    }
  };

  const handleSearch = async (q?: string) => {
    const query = (q ?? searchQuery).trim();
    if (!query) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch('/api/ai/browser/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 10 }),
      });
      if (!res.ok) throw new Error('Search service unavailable');
      const data = await res.json();
      const sourceResults = Array.isArray(data.links) ? data.links : [];
      const enriched = sourceResults.map((item: any) => ({
        title: item.title || item.url,
        url: item.url,
        content: item.snippet || item.title || '',
        source: 'web',
      }));
      setSearchResults(enriched);
      setView('search');
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearHistory = () => {
    persistHistory([]);
  };

  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      desc: 'AI-powered web search with cited sources.',
    },
    {
      icon: Brain,
      title: 'Summarize',
      desc: 'AI summarization powered by Ollama.',
    },
    {
      icon: FileText,
      title: 'Screenshot',
      desc: 'Capture page content via backend engine.',
    },
    {
      icon: Globe,
      title: 'History',
      desc: 'Persistent local browsing history.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setView('home')}
            className="p-2 hover:bg-white/5 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            AI Browser
          </div>
        </div>
      </header>

      {view === 'home' && (
        <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
              <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold">AI-Powered Browser</h1>
            <p className="text-base sm:text-xl text-gray-400">
              Browse, search, summarize, and capture screenshots in one place.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-left">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Visit a site
              </label>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com or https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
                />
                <button
                  onClick={() => handleNavigate()}
                  className="px-4 py-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Go</span>
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 text-center hover:border-white/20 transition"
                >
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="font-bold mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold">History</h3>
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setUrl(item.url);
                        handleNavigate(item.url);
                      }}
                      className="w-full text-left flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] transition"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.title || item.url}</div>
                        <div className="text-xs text-gray-500 truncate">{item.url}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {(view === 'browser' || view === 'search') && (
        <section className="container mx-auto px-3 sm:px-4 py-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <input
                  value={view === 'search' ? searchQuery : url}
                  onChange={(e) => {
                    if (view === 'search') setSearchQuery(e.target.value);
                    else setUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (view === 'search') handleSearch();
                      else handleNavigate();
                    }
                  }}
                  placeholder={view === 'search' ? 'Search the web...' : 'Enter URL...'}
                  className="w-full bg-transparent text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none"
                />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (view === 'search') {
                                  handleSearch();
                                } else {
                                  handleNavigate();
                                }
                              }}
                              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl text-sm font-semibold hover:opacity-90 transition flex items-center gap-2"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                              <span className="hidden sm:inline">Go</span>
                            </button>
                            {view === 'browser' && url && (
                              <>
                                <button
                                  onClick={handleScreenshot}
                                  disabled={loadingScreenshot}
                                  className="px-3 py-2 border border-white/10 rounded-xl text-sm hover:bg-white/5 transition disabled:opacity-60"
                                >
                                  {loadingScreenshot ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Screenshot'
                                  )}
                                </button>
                                <button
                                  onClick={handleSummarize}
                                  disabled={loadingSummary}
                                  className="px-3 py-2 border border-white/10 rounded-xl text-sm hover:bg-white/5 transition disabled:opacity-60 flex items-center gap-2"
                                >
                                  {loadingSummary ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Brain className="w-4 h-4" />
                                  )}
                                  <span className="hidden sm:inline">Summarize</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setView('home')}
                              className="px-3 py-2 border border-white/10 rounded-xl text-sm hover:bg-white/5 transition"
                            >
                              Home
                            </button>
                          </div>
                        </div>
                      </div>

          <div className="mt-4 grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {view === 'browser' ? (
                <div className="relative w-full" style={{ minHeight: '65vh' }}>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={loading ? '' : `/api/browser/proxy?url=${encodeURIComponent(url)}`}
                    title="Browser"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    className="w-full h-[65vh]"
                  />
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-3">
                  {searching && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" /> Searching...
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <div className="text-gray-500">No results yet. Try a search query.</div>
                  )}
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setUrl(result.url || '');
                        handleNavigate(result.url || '');
                      }}
                      className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.06] transition"
                    >
                      <div className="text-yellow-400 text-sm hover:underline truncate">
                        {result.title}
                      </div>
                      <div className="text-green-400 text-xs truncate">{result.url}</div>
                      <div className="text-gray-400 text-sm mt-1 line-clamp-2">{result.content}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {screenshotUrl && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
                  <div className="text-sm font-semibold mb-2">Screenshot</div>
                  <img src={screenshotUrl} alt="Page screenshot" className="rounded-xl border border-white/10" />
                </div>
              )}

              {summary && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
                  <div className="text-sm font-semibold mb-2">Summary</div>
                  <div className="text-sm text-gray-300 whitespace-pre-line">{summary}</div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl p-3 sm:p-4 flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-sm">{error}</div>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
                <div className="text-sm font-semibold mb-3">Quick search</div>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search the web..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={searching}
                    className="px-3 py-2 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl text-sm disabled:opacity-60"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
