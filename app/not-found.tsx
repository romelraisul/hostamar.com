// App-Router 404. Pure static server component — no client hooks, no next/link,
// no `Html` import — so Vercel's build-time prerender of /404 succeeds.
export const dynamic = 'force-static'

export default function NotFound() {
  return (
    <div style={{ padding: 80, textAlign: 'center' }}>
      <h1>404 - Not Found</h1>
      <p>hostamar.com - page not found</p>
      <a href="/">Go Home</a>
    </div>
  )
}
