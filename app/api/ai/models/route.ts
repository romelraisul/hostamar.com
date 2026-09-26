import { NextResponse } from 'next/server'
import { HOSTAMAR_ALL, HOSTAMAR_FREE_MODELS, HOSTAMAR_LOCAL_MODELS } from '@/lib/hostamar-models'
export const dynamic='force-dynamic'
export async function GET(){
  return NextResponse.json({
    provider: 'ai.hostamar.com',
    endpoint: 'https://ai.hostamar.com/v1',
    omniroute: 'http://127.0.0.1:20128/v1',
    free_models: HOSTAMAR_FREE_MODELS,
    local_models: HOSTAMAR_LOCAL_MODELS,
    all: HOSTAMAR_ALL,
    counts: { free: HOSTAMAR_FREE_MODELS.length, local: HOSTAMAR_LOCAL_MODELS.length, total: HOSTAMAR_ALL.length, nvidia: 0 },
    verification: { fb_proxy_free: true, freebuff_proxy_free: true, deepseek_v4_pro_via_fb_free: true, nvidia_removed: true, hostamar_untouched: true }
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}

export const runtime = 'edge'

