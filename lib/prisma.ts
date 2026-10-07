// MUST be imported before @prisma/client so the bootstrap overrides
// node:dns.lookup before any neon-style TCP socket is created.
import './dns-bootstrap'
// ponytail: workerd/Node-condition trap. `.prisma/client/package.json` maps
// "@prisma/client" -> index.js (runtime/library.js) under the `node` condition,
// and library.js calls require('fs').readdir to locate its engine -> unenv throws
// "[unenv] fs.readdir is not implemented yet!" -> EVERY Prisma query on the Worker
// is swallowed (dashboard counts rendered as 0). The /wasm entry uses
// runtime/wasm.js: no fs anywhere, query compiler compiled to WASM, driver-adapter
// based. Import it explicitly so no bundler condition resolution can pick library.js.
import { PrismaClient } from '@prisma/client/wasm'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
// ponytail: keep the fetch-only /web client for the ADAPTER — @libsql/client's
// node entry pulls node:sqlite/ws/fs and dies on workerd. (This is NOT the cause
// of "[unenv] fs.readdir" — that came from Prisma's own node runtime, see import above.)
import { createClient as createWebClient } from '@libsql/client/web'
import { env } from '@/lib/env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // ponytail: Cloudflare Workers only set TURSO_DATABASE_URL/TURSO_AUTH_TOKEN,
  // never DATABASE_URL. Fall back so the Worker can reach Turso without a
  // second secret. Upgrade path: set DATABASE_URL explicitly and this is a no-op.
  const url = process.env.DATABASE_URL
    || (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
        ? `${process.env.TURSO_DATABASE_URL}?authToken=${process.env.TURSO_AUTH_TOKEN}`
        : '')
    || ''

  if (!url) {
    throw new Error('DATABASE_URL not configured — Prisma client cannot be created')
  }
  
  // ponytail: schema is sqlite (Turso/libsql). All paths use PrismaLibSQL.
  // postgresql:// URLs (local dev) are redirected to a local file DB so the
  // same sqlite schema works everywhere. Upgrade path: point local dev at
  // the cloud Turso instance instead of redirecting.
  let cleanUrl: string
  let authToken: string
  if (url.startsWith('libsql://') || url.startsWith('file:')) {
    cleanUrl = url.split('?')[0]
    authToken = url.split('authToken=')[1] || ''
  } else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    cleanUrl = 'file:/home/romel/hostamar-local.db'
    authToken = ''
  } else {
    cleanUrl = url.split('?')[0]
    authToken = url.split('authToken=')[1] || ''
  }
  const libsql = createWebClient({ url: cleanUrl, authToken })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// ponytail: truly lazy — no throw on import, only on first actual method call.
// Vercel build-time imports this module without DATABASE_URL; checkout route
// checks hasDb at runtime and only calls prisma if DB is configured.
let prismaInstance: PrismaClient | null = null
let prismaInitError: Error | null = null

function getPrisma(): PrismaClient {
  if (prismaInitError) throw prismaInitError
  if (!prismaInstance) {
    try {
      prismaInstance = createPrismaClient()
    } catch (e) {
      prismaInitError = e as Error
      throw prismaInitError
    }
  }
  return prismaInstance
}

// ponytail: workerd hung-kill guard. Prisma's WASM query engine cannot be
// entered by two requests at once on workerd: the runtime cancels the request
// ("code had hung and would never generate a response") instead of erroring.
// Measured on hostamar-pages: same route 0/20 failed sequentially, 11/12 failed
// at 6 concurrent; an admin tab fires its fetches in parallel, so tabs broke.
// Raw @libsql/client/web on the same DB was 30/30 both ways — the engine bridge
// is the problem, not the DB or the network. Fix: never be inside the engine
// twice on one isolate — queue every query on a single promise chain.
// ponytail: one global queue per isolate (head-of-line blocking; an admin-only
// console makes that fine). Upgrade path: raw libsql per route, or per-request
// engine instances, if throughput ever matters.
let engineQueue: Promise<unknown> = Promise.resolve()

// ponytail: bound head-of-line blocking. A queued op that hasn't STARTED within
// this window means the isolate is wedged (or a heavy op is ahead of us) — the
// edge cancels such requests at ~30s anyway, so fail this caller early with a
// JSON error instead of holding the connection. The op still runs when its turn
// comes; we only stop waiting. Upgrade path: per-request engine instances.
const QUEUE_CEILING_MS = 8_000
// Log only outliers (>2s): enough to tell "queue wait" from "engine run" when an
// admin tab intermittently crawls, without flooding the tail.
const SLOW_OP_MS = 2_000

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now()
  let startedAt = 0
  const start = () => {
    startedAt = Date.now()
    return fn()
  }
  const run = engineQueue.then(start, start) // wait for the previous op, ok or not
  engineQueue = run.then(
    () => undefined,
    () => undefined,
  ) // keep the chain alive on errors

  const settled = run.then(
    () => {
      const total = Date.now() - t0
      if (total > SLOW_OP_MS) {
        console.log(`[prisma] slow op wait=${startedAt - t0}ms run=${Date.now() - startedAt}ms total=${total}ms`)
      }
    },
    () => undefined,
  )

  return new Promise<T>((resolve, reject) => {
    settled.then(() => undefined)
    run.then(resolve, reject)
    const timer = setTimeout(() => {
      if (!startedAt) reject(new Error(`prisma op still queued after ${QUEUE_CEILING_MS}ms — isolate busy`))
    }, QUEUE_CEILING_MS)
    run.then(
      () => clearTimeout(timer),
      () => clearTimeout(timer),
    )
  })
}

const delegateCache = new WeakMap<object, Map<string | symbol, unknown>>()

// Wrap a model delegate (prisma.customer, prisma.order, …) so every method it
// exposes runs through the queue, while non-function properties (rare) pass through.
function wrapDelegate(delegate: object): object {
  let per = delegateCache.get(delegate)
  if (!per) {
    per = new Map()
    delegateCache.set(delegate, per)
  }
  return new Proxy(delegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      if (per!.has(prop)) return per!.get(prop)
      const wrapped = (...args: unknown[]) =>
        serialized(() => (value as (...a: unknown[]) => Promise<unknown>).apply(target, args))
      per!.set(prop, wrapped)
      return wrapped
    },
  })
}

// $transaction takes a callback that receives its own client; queueing it would
// deadlock the callback's own queries, so it stays unwrapped (no admin route uses it).
const UNSERIALIZED = new Set(['$transaction', '$connect', '$disconnect', '$on', '$extends'])

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined // avoid Promise-like coercion
    const client = getPrisma()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      if (UNSERIALIZED.has(prop as string)) return value.bind(client)
      return (...args: unknown[]) =>
        serialized(() => (value as (...a: unknown[]) => Promise<unknown>).apply(client, args))
    }
    if (value && typeof value === 'object') return wrapDelegate(value)
    return value
  },
}) as PrismaClient

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
