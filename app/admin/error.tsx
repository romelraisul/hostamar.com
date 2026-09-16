'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6EBD2]">
      <div className="max-w-md rounded-lg border border-[#D8CDB4] bg-[#FFFDF6] p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-xl font-semibold text-[#1C1917]">Admin Error</h2>
        <p className="mb-6 text-sm text-[#78716C]">{error.message || 'Something went wrong'}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-md bg-[#0E7C3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A5A2B]"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-md border border-[#CBBFA4] px-4 py-2 text-sm font-medium text-[#57534E] hover:bg-[#FDF8EC]"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
