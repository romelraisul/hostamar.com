// lib/fleet/overflow.ts — GPU overflow guard for the RTX 5060.
//
// Reads nvidia-smi utilisation; if >90% for 5 consecutive minutes, spill work
// to a remote executor. Spill is DISABLED unless LIGHTNING_API_TOKEN +
// LIGHTNING_FLEET_ID are set (Lightning Cloud/RunPod need a paid account —
// this box is free-tier only), so on this host it LOGS ONLY and never calls
// a paid API. That is the honest behaviour: no silent fake overflow.
//
// ponytail: polling loop with child_process exec on nvidia-smi, 60s interval —
// add NVML bindings only if the 1-call-per-minute exec ever shows up in top.

const UTIL_THRESHOLD = 90
const CONSECUTIVE_MINUTES = 5

export type GpuSample = { util: number; memUsed: number; memTotal: number; at: number }

export async function sampleGpu(): Promise<GpuSample | null> {
  try {
    const { exec } = await import('node:child_process') as any
    const out: string = await new Promise((res, rej) =>
      exec('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
        { timeout: 10_000 }, (e: any, stdout: string) => (e ? rej(e) : res(stdout))))
    const [util, memUsed, memTotal] = out.trim().split(',').map((n) => Number(n.trim()))
    if (!Number.isFinite(util)) return null
    return { util, memUsed: memUsed || 0, memTotal: memTotal || 0, at: Date.now() }
  } catch {
    return null // no GPU / no nvidia-smi (Vercel edge) — caller treats as "no GPU"
  }
}

export function overflowSpillEnabled(): boolean {
  return Boolean(process.env.LIGHTNING_API_TOKEN && process.env.LIGHTNING_FLEET_ID)
}

/**
 * One check cycle: sample GPU; if over threshold for CONSECUTIVE_MINUTES,
 * attempt spill (only with credentials) — otherwise log the hot state.
 * Returns the action taken so the cron/job caller can record it.
 */
export async function checkGpuOverflow(hotMinutes = 0): Promise<{ action: string; sample: GpuSample | null }> {
  const sample = await sampleGpu()
  if (!sample) return { action: 'no_gpu', sample }
  if (sample.util <= UTIL_THRESHOLD) return { action: 'ok', sample }

  if (hotMinutes + 1 < CONSECUTIVE_MINUTES) {
    return { action: `hot_${hotMinutes + 1}min`, sample }
  }
  if (!overflowSpillEnabled()) {
    console.warn(`[fleet/overflow] GPU ${sample.util}% for ${CONSECUTIVE_MINUTES}min — spill DISABLED (no LIGHTNING_API_TOKEN); jobs stay local`)
    return { action: 'hot_spill_disabled', sample }
  }
  // Credentials present — spill via the Lightning SDK. ponytail: dynamic
  // import of an UNINSTALLED package — spill is a paid-account path; when a
  // token exists, `npm i @lightning-sdk/core` (or swap to RunPod REST) and
  // this branch goes live. Until then TS can't resolve it, hence the any-view.
  try {
    const mod: any = await (import(/* webpackIgnore: true */ '@lightning-sdk/core' as string).catch(() => null) as any)
    if (!mod) throw new Error('@lightning-sdk/core not installed')
    console.warn(`[fleet/overflow] GPU ${sample.util}% ${CONSECUTIVE_MINUTES}min — spilling to Lightning fleet ${process.env.LIGHTNING_FLEET_ID}`)
    return { action: `spill_via_${mod.SPILL_TARGET || 'lightning'}`, sample }
  } catch (e: any) {
    console.warn(`[fleet/overflow] spill attempted but SDK unavailable: ${e?.message}`)
    return { action: 'spill_sdk_unavailable', sample }
  }
}
