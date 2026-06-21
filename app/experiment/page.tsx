"use client"

import { useState, useEffect } from 'react'

type Stats = {
  emails: number
  videos: Record<string, number>
  subscriptions: Record<string, number>
  generatedAt: string
}

export default function ExperimentDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/experiment/stats')
        const data = await res.json()
        setStats(data)
      } catch {
        // pass
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Experiment Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Onboarding V2 A/B test — real-time metrics from the database.
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        ) : stats ? (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Emails captured */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Emails Captured</h2>
              <div className="text-4xl font-bold text-blue-600">{stats.emails}</div>
              <p className="text-xs text-gray-400 mt-2">From onboarding flow</p>
            </div>

            {/* Videos generated */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Videos</h2>
              <div className="space-y-1">
                {Object.entries(stats.videos).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.videos).length === 0 && (
                  <p className="text-gray-400 text-sm">No videos yet</p>
                )}
              </div>
            </div>

            {/* Subscriptions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Subscriptions</h2>
              <div className="space-y-1">
                {Object.entries(stats.subscriptions).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.subscriptions).length === 0 && (
                  <p className="text-gray-400 text-sm">No subscriptions yet</p>
                )}
              </div>
            </div>

            {/* Funnel summary */}
            <div className="md:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Funnel</h2>
              <div className="space-y-3">
                <FunnelStep label="Email Captured" count={stats.emails} total={stats.emails || 1} />
                <FunnelStep label="Video Created" count={stats.videos?.completed || 0} total={stats.emails || 1} />
                <FunnelStep label="Subscribed" count={stats.subscriptions?.active || 0} total={stats.emails || 1} />
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
                <span className="ml-2">(auto-refreshes every 30s)</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-red-500">
            Failed to load experiment data. Is the API reachable?
          </div>
        )}
      </div>
    </div>
  )
}

function FunnelStep({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
