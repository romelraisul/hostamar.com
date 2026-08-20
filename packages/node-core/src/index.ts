/**
 * @hostamar/node-core — shared background node logic for Windows/Linux/Mac/Phone.
 * Runs 3 services even when UI closed: tunnel + gateway + worker.
 * 0 Taka, no JumpServer (Tailscale mesh).
 */
export const CREDIT_POOL = 6000
export const COST = { video: 100, chat: 1, browser: 5, ide: 10, game: 20, hosting: 0 } as const

export type ProductId = keyof typeof COST

export interface NodeHealth {
  status: 'ok'
  service: 'hostamar-ai-gateway'
  credits: number
  models: number
  uptime: number
  node: string
  tailscaleIp?: string
}

export function healthz(nodeId = 'hostamar-app'): NodeHealth {
  return { status: 'ok', service: 'hostamar-ai-gateway', credits: CREDIT_POOL, models: 93, uptime: process.uptime(), node: nodeId }
}

export function deduct(credits: number, cost: number): number {
  return Math.max(0, credits - cost)
}

/** Build correct shell commands — fixes --name error. */
export function tunnelCmd(name = 'hostamar-app'): string[] {
  return ['cloudflared', 'tunnel', 'run', name] // NOT --name
}
export function gatewayCmd(path = 'C:\\hostamar\\gateway.py'): string[] {
  return ['python', path]
}
