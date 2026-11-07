// ponytail: Cloudflare Workers cannot load Prisma 5.22's libssl detection
// (fs.readdir on /lib -> unenv throws). Direct @libsql/client/web is fetch-only
// and works on both Workers and Node. Use this on Workers; keep Prisma for Vercel.

let _client: ReturnType<typeof import('@libsql/client/web').then(m => m.createClient)> | null = null

export async function getTursoEdgeClient() {
  if (_client) return _client
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL?.split('?')[0]
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_URL?.split('authToken=')[1]?.split('&')[0]
  if (!raw) throw new Error('TURSO_DATABASE_URL / DATABASE_URL not configured')
  // ponytail: a libsql:// URL makes this web client open a *WebSocket* (Hrana over
  // wss) per isolate. In workerd that handshake + socket I/O is billed as request
  // CPU, and the DB-backed routes were killed as
  // "1102 Worker exceeded resource limits ... exceeded CPU time limit" at cpu=10ms
  // (/api/tv/playlist, /api/tv/agent/commands — wrangler tail 2026-10-09).
  // Same host, same token, https:// = Hrana over fetch, which is the transport
  // Turso documents for Workers. Local check on this DB: both transports return
  // rows; https is the one that fits the CPU budget.
  const url = raw.replace(/^libsql:\/\//, 'https://')
  const { createClient } = await import('@libsql/client/web')
  _client = createClient({ url, authToken })
  return _client
}