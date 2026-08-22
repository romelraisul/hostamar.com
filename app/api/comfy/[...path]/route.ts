export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
const COMFY_URLS = [
  env.COMFY_URL || 'http://127.0.0.1:8188',
  'http://host.docker.internal:8188',
  'http://172.17.112.1:8188',
]
async function fetchComfy(path: string, init?: RequestInit){
  for(const base of COMFY_URLS){
    try{
      const r = await fetch(base.replace(/\/$/,'') + path, { ...(init||{}), signal: AbortSignal.timeout(8000) } as any)
      if(r.ok || r.status < 500) return r
    }catch{}
  }
  throw new Error('ComfyUI unreachable (tried '+COMFY_URLS.join(', ')+')')
}
export async function GET(req: NextRequest){
  const url = new URL(req.url)
  // Support ?path=/system_stats or /api/comfy/system_stats
  const qPath = url.searchParams.get('path')
  const pPath = url.pathname.replace(/^\/api\/comfy\/?/, '')
  const targetPath = (qPath || (pPath ? '/'+pPath : '')) || '/system_stats'
  try{
    const r = await fetchComfy(targetPath + (url.search && !qPath ? url.search : ''))
    const text = await r.text()
    return new NextResponse(text, { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/json' } })
  }catch(e:any){ return NextResponse.json({error: e.message, comfy:false, fallback:'ffmpeg green'}, { status: 200 }) }
}
export async function POST(req: NextRequest){
  const url = new URL(req.url)
  const qPath = url.searchParams.get('path')
  const pPath = url.pathname.replace(/^\/api\/comfy\/?/, '')
  const targetPath = (qPath || (pPath ? '/'+pPath : '')) || '/prompt'
  try{
    const body = await req.text()
    const r = await fetchComfy(targetPath, { method:'POST', headers: { 'Content-Type': 'application/json' }, body })
    const text = await r.text()
    return new NextResponse(text, { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/json' } })
  }catch(e:any){ return NextResponse.json({error: e.message, comfy:false}, { status: 200 }) }
}
