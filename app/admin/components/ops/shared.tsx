'use client'
import { useEffect } from 'react'

// Severity palette mirrors the admin page conventions (green/black hybrid).
export const SEV: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  info:    { dot: 'bg-sky-400',   text: 'text-sky-300',   bg: 'bg-sky-500/10',   border: 'border-sky-500/20',   label: 'INFO' },
  success: { dot: 'bg-[#10B981]', text: 'text-[#10B981]', bg: 'bg-[#0E7C3A]/10', border: 'border-[#10B981]/20', label: 'OK' },
  warn:    { dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'WARN' },
  alert:   { dot: 'bg-red-500',   text: 'text-red-300',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   label: 'ALERT' },
}
export function sev(s?: string | null) { return SEV[(s || 'info').toLowerCase()] || SEV.info }

export function num(n?: number | null) { return (n ?? 0).toLocaleString() }
export function bdt(n?: number | null) { return `৳${num(n)}` }

// Relative time from an ISO timestamp: 12s / 5m / 3h / 2d ago.
export function relTime(iso?: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60); if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

// Compact age from a minute count (used for last-run in the lane grid).
export function ageLabel(min?: number | null): string {
  if (min == null || !Number.isFinite(min)) return '—'
  if (min < 1) return 'just now'
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`
  return `${Math.round(h / 24)}d`
}

export async function jjson<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'include', ...opts })
  if (!r.ok) {
    const e: any = new Error(`${r.status} ${r.statusText || ''}`.trim())
    e.status = r.status
    try { e.body = await r.json() } catch { /* non-JSON body */ }
    throw e
  }
  return r.json()
}

// Human-friendly error text; 404/5xx degrade gracefully when the ops backend
// endpoints are not deployed yet (see contract).
export function errText(e: any): string {
  const s = e?.status
  if (s === 404) return 'Ops backend not deployed yet (404) — /api/admin/ops/* is coming online.'
  if (s === 403) return 'Forbidden — admin session required.'
  if (s === 500 || s === 502 || s === 503) return `Ops backend error (${s}) — retrying automatically.`
  return e?.message || 'Request failed'
}

// Re-runs `load` every ms while the tab is visible; cleared on unmount.
export function useLivePoll(load: () => void, ms: number) {
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load() }, ms)
    return () => clearInterval(t)
  }, [load, ms])
}
