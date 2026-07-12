// App-Router 404. force-dynamic (matching the root layout) so Vercel does NOT
// statically prerender /404 — static prerender of a page wrapped in a dynamic
// root layout forces Next into its internal /_error fallback (which imports
// `Html` from next/document and crashes the build with "<Html> should not be
// imported outside of pages/_document"). No client hooks, no next/link,
// no `Html` import.
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <h1>404 - Not Found</h1>
      <p>hostamar.com - page not found</p>
      <a href="/">Go Home</a>
    </div>
  )
}
