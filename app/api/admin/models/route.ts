import { NextRequest, NextResponse } from 'next/server'

const DMR_BASE_URL = 'http://localhost:12434/engines/v1'

// In-memory circuit breaker state (shared across API routes)
export const circuitBreakers: Record<string, { state: 'closed' | 'open'; failures: number; lastFailureAt: string | null }> = {}

const MODEL_META: Record<string, { name: string; size: string; type: string; vramGB: number; asyncOnly: boolean }> = {
  'smollm3:F16': { name: 'Smollm3 (3B)', size: '5.73GB', type: 'chat', vramGB: 5.73, asyncOnly: false },
  'qwen3.6:27B': { name: 'Qwen 3.6 (27B)', size: '16.39GB', type: 'chat', vramGB: 16.39, asyncOnly: true },
  'seed-oss:36B-UD-IQ1_M': { name: 'Seed OSS (36B)', size: '8.45GB', type: 'chat', vramGB: 8.45, asyncOnly: true },
  'stable-diffusion:latest': { name: 'Stable Diffusion', size: '6.94GB', type: 'image', vramGB: 6.94, asyncOnly: true },
}

export async function GET(request: NextRequest) {
  try {
    const dmrRes = await fetch(`${DMR_BASE_URL}/models`, { signal: AbortSignal.timeout(5000) })
    const dmrData = await dmrRes.json() as { data: Array<{ id: string }> }

    const models = dmrData.data.map(dmrModel => {
      const id = dmrModel.id.replace('docker.io/ai/', '')
      const meta = MODEL_META[id] || { name: id, size: 'unknown', type: 'chat', vramGB: 0, asyncOnly: false }
      const cb = circuitBreakers[id]
      return {
        id,
        name: meta.name,
        size: meta.size,
        type: meta.type,
        vramGB: meta.vramGB,
        asyncOnly: meta.asyncOnly,
        circuitBreaker: cb?.state || 'closed',
        failures: cb?.failures || 0,
        lastFailureAt: cb?.lastFailureAt || null,
      }
    })

    return NextResponse.json({ models, total: models.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch model status', models: [], total: 0 },
      { status: 200 }
    )
  }
}
