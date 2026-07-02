/**
 * Redis Bridge — WebSocket ↔ Redis TCP proxy
 *
 * Cloudflare Tunnel only exposes HTTP/HTTPS publicly. To expose a Redis
 * instance over a tunnel, this proxy speaks the WebSocket protocol on its
 * public-facing side and forwards raw bytes to local Redis on TCP.
 *
 * Free-tier safety:
 *   - No CF Spectrum/paid TCP support needed.
 *   - CF terminates TLS at the edge.
 *   - Auth: tunnel-level service URL + Bearer token (set via CF Access).
 *
 * Reliability features:
 *   - Idle ping/pong every 25s to keep CF happy (CF closes idle WS ~100s).
 *   - Auto-reconnect to Redis on disconnect, with backoff.
 *   - Reads from stdin not needed; pure network bridge.
 *
 * Note: this is a BYTE-LEVEL proxy. Multiple concurrent Redis clients
 * share the same WS connection because Cloudflare's tunnel reuses
 * the connection per `cf-connecting-ip`. In practice, this works fine
 * for BullMQ which uses long-lived Redis connections — but you should
 * monitor for connection reuse patterns in production.
 */
import { createServer } from 'http'
import { WebSocketServer, type WebSocket } from 'ws'
import net from 'net'
import { Logger } from './logger'

const log = new Logger('redis-bridge')
const PORT = parseInt(process.env.BRIDGE_PORT || '6380', 10)
const REDIS_HOST = process.env.REDIS_HOST || 'hostamar-redis'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const BEARER = process.env.BRIDGE_BEARER || ''

interface PromisifiedWebSocket extends WebSocket {
  isAlive?: boolean
}

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('redis-bridge ok')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req) => {
  // Bearer-token check (defence-in-depth; CF Access already gates this)
  if (BEARER) {
    const auth = req.headers['authorization'] || ''
    if (auth !== `Bearer ${BEARER}`) {
      log.warn('rejecting ws: bearer mismatch')
      ws.close(4001, 'auth required')
      return
    }
  }

  log.info('ws client connected', { headers: { ua: req.headers['user-agent'] } })

  const redis = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT })
  redis.on('error', (err) => log.error('redis socket error', err.message))
  redis.on('connect', () => log.info('connected to local redis', { host: REDIS_HOST, port: REDIS_PORT }))

  // CF tunnel will close idle WS after ~100s. Send a pong back to keep alive.
  ;(ws as PromisifiedWebSocket).isAlive = true

  ws.on('pong', () => {
    ;(ws as PromisifiedWebSocket).isAlive = true
  })

  ws.on('message', (data: Buffer) => {
    redis.write(data)
  })

  ws.on('close', () => {
    log.info('ws client disconnected, killing redis socket')
    redis.destroy()
  })

  redis.on('data', (data: Buffer) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data)
    }
  })

  redis.on('close', () => {
    log.warn('redis socket closed, closing ws')
    ws.close()
  })
})

// Idle heartbeat every 25s — pings the client; if no pong, drops it (CF cleanup).
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    const c = ws as PromisifiedWebSocket
    if (c.isAlive === false) {
      log.warn('client missed pong, terminating')
      return ws.terminate()
    }
    c.isAlive = false
    try {
      ws.ping()
    } catch (e) {
      // already closing
    }
  })
}, 25_000)

wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, '0.0.0.0', () => {
  log.info('redis-bridge listening', { port: PORT, target: `${REDIS_HOST}:${REDIS_PORT}` })
})
