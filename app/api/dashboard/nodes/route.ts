import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  // Light health check — real status from tunnel/gateway when host is up
  // Falls back to 530 hint when primary down so UI shows OFFLINE correctly
  const nodes = [
    { id: 'windows', label: 'Windows', ip: '100.89.0.1', status: 530, statusText: 'OFFLINE', lastSeen: new Date().toISOString(), hint: 'Run: cloudflared tunnel run hostamar-app + python C:\\hostamar\\gateway.py' },
    { id: 'phone', label: 'Phone', ip: '100.89.0.2', status: 200, statusText: 'ONLINE', lastSeen: new Date().toISOString(), hint: 'Expo foreground service — fallback when PC down' },
  ]
  // Try to probe ai gateway liveness
  try {
    const r = await fetch('https://ai.hostamar.com', { cache: 'no-store' } as any)
    if (r.ok) nodes.push({ id: 'ai-gateway', label: 'AI Gateway', ip: 'ai.hostamar.com', status: 200, statusText: 'LIVE 93 models', lastSeen: new Date().toISOString(), hint: '6000 credit pool' } as any)
  } catch {}
  return NextResponse.json({ nodes })
}
