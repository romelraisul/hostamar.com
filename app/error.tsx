'use client'

// App-Router error boundary (500). Client component (required by Next).
// force-dynamic so Vercel does NOT statically prerender /500 — prerendering
// a client error page triggers Next's internal Pages-Router /500 fallback
// (which imports `Html` from next/document and crashes the build). Rendering
// on-demand avoids that. No next/link/Html import.
export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <pre style={{ fontSize: 12 }}>{error.message}</pre>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
