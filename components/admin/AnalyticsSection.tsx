export default function AnalyticsSection({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
        <p className="text-slate-300 text-sm">
          {analytics ? 'Analytics data loaded from /api/analytics.' : 'No analytics data available yet.'}
        </p>
        <pre className="mt-3 text-xs text-slate-400 bg-black/20 p-3 rounded-lg overflow-auto">
          {JSON.stringify(analytics, null, 2)}
        </pre>
      </div>
    </div>
  )
}
