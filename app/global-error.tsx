'use client'

// App-Router global error boundary. MUST render its own <html><body> (Next
// requirement) — using lowercase tags, NEVER `Html` from `next/document`.
// force-dynamic so Vercel does NOT statically prerender /500 (which would
// invoke Next's internal Pages-Router /500 page that imports `Html` and
// crashes with "<Html> should not be imported outside of pages/_document").
export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="bn">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1c',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          কিছু একটা ভুল হয়েছে
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
          Something went wrong. (500)
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          আবার চেষ্টা করুন / Retry
        </button>
      </body>
    </html>
  )
}
