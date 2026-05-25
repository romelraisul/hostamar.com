'use client';

import { useState, useEffect, useCallback } from 'react';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  data?: Record<string, unknown>;
}

const levelColors: Record<LogLevel, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const levelBg: Record<LogLevel, string> = {
  info: 'bg-blue-400/10 border-blue-400/30',
  warn: 'bg-yellow-400/10 border-yellow-400/30',
  error: 'bg-red-400/10 border-red-400/30',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level !== 'all') params.set('level', level);
    if (search) params.set('q', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', page.toString());
    params.set('limit', '100');

    try {
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [level, search, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleFilterChange = (newLevel: LogLevel | 'all') => {
    setLevel(newLevel);
    setPage(1);
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500"
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Level</label>
              <div className="flex gap-2">
                {(['all', 'info', 'warn', 'error'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleFilterChange(l)}
                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                      level === l
                        ? l === 'all'
                          ? 'bg-gray-700 text-white'
                          : `${levelBg[l as LogLevel]} border text-white`
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="text-sm text-gray-500 mb-4">{total} entries found</div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No logs found</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {logs.map((log, i) => (
                <div key={i} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${levelColors[log.level]} border ${levelBg[log.level]}`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </span>
                    {log.service && (
                      <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                        {log.service}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-300 font-mono">{log.message}</p>
                  {log.data && (
                    <pre className="mt-2 text-xs text-gray-500 bg-gray-950 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
