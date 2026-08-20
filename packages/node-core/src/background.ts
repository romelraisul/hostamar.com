/**
 * Background runner — keeps tunnel + gateway alive when UI closed.
 * Desktop: Tauri tray / systemd / LaunchAgent calls this.
 * Phone: Expo TaskManager foreground service calls this.
 */
import { spawn, ChildProcess } from 'child_process'
import { tunnelCmd, gatewayCmd, healthz } from './index'

let tunnel: ChildProcess | null = null
let gateway: ChildProcess | null = null

export function startTunnel(name = process.env.TUNNEL_NAME || 'hostamar-app') {
  if (tunnel) return tunnel
  const [cmd, ...args] = tunnelCmd(name)
  const token = process.env.TUNNEL_TOKEN
  const finalArgs = token ? ['tunnel', 'run', '--token', token] : args
  const finalCmd = token ? 'cloudflared' : cmd
  tunnel = spawn(finalCmd, finalArgs, { stdio: 'inherit', shell: false })
  tunnel.on('exit', () => { tunnel = null })
  return tunnel
}

export function startGateway(pyPath = process.env.GATEWAY_PY || 'C:\\hostamar\\gateway.py') {
  if (gateway) return gateway
  const [cmd, ...args] = gatewayCmd(pyPath)
  gateway = spawn(cmd, args, { stdio: 'inherit', shell: true })
  gateway.on('exit', () => { gateway = null })
  return gateway
}

export function stopAll() {
  tunnel?.kill(); gateway?.kill(); tunnel = null; gateway = null
}

export function getHealth() { return healthz() }

// CLI
if (require.main === module) {
  const cmd = process.argv[2]
  if (cmd === 'tunnel') startTunnel(process.argv[3])
  else if (cmd === 'gateway') startGateway(process.argv[3])
  else if (cmd === 'health') console.log(JSON.stringify(healthz(), null, 2))
  else console.log('usage: node background.js [tunnel|gateway|health]')
}
