'use client'

export default function AiBrowserPage() {
  return (
    <section style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>AI Browser</h1>
      <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        Use the main <strong>/browser</strong> experience, or run AI-assisted research below.
      </p>
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        <a
          href="/browser"
          style={{
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '1rem',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <strong>Open browser</strong>
          <div style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: '0.5rem' }}>Launch `/browser` with built-in search.</div>
        </a>
        <form
          method="get"
          action="/api/ai/browser/search"
          style={{
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '1rem',
          }}
        >
          <label htmlFor="q" style={{ display: 'block', marginBottom: '0.5rem' }}>
            <strong>Search</strong>
          </label>
          <input
            id="q"
            name="q"
            placeholder="Search the web"
            required
            style={{
              width: '100%',
              padding: '0.6rem 0.7rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'inherit',
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: '0.75rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Search
          </button>
        </form>
      </div>
    </section>
  )
}
