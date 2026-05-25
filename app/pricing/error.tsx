'use client'

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="max-w-md rounded-lg border border-slate-700 bg-slate-800 p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-xl font-semibold text-white">Pricing Error</h2>
        <p className="mb-6 text-sm text-slate-400">{error.message || 'Something went wrong'}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
