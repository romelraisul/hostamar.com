// ponytail: Cloudflare Workers cannot load Prisma 5.22's libssl detection
// (fs.readdir on /lib -> unenv throws). Direct @libsql/client/web is fetch-only
// and works on both Workers and Node. Use this on Workers; keep Prisma for Vercel.
import { createClient } from '@libsql/client/web'

let _client: ReturnType<typeof createClient> | null = null

export function getTursoEdgeClient() {
  if (_client) return _client
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL?.split('?')[0]
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_URL?.split('authToken=')[1]?.split('&')[0]
  if (!url) throw new Error('TURSO_DATABASE_URL / DATABASE_URL not configured')
  _client = createClient({ url, authToken })
  return _client
}