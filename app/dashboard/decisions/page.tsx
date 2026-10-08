'use client'
export const dynamic = 'force-dynamic'

/**
 * /dashboard/decisions — the audit dashboard's Decision API tab.
 *
 * Six PINs, live, shadow mode: it asks the local Jev model what it WOULD pick for
 * each decision point and shows the verdict + confidence. Nothing is routed by
 * this page — the middleware/callers still decide, so a wrong model call here
 * costs nothing but is visible. confidence < 0.60 → amber "Unsure" (the 60% rule).
 *
 * Data: GET /api/decision?pins=1 (catalog, public) · POST /api/decision (verdict,
 * falls back per-PIN when the home box is off) · GET /api/decision (receipts, auth).
 */
import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'

type Pin = { id: string; who: string; question: string; choices: string[]; fallback: string; judges?: number; layer: string; note?: string }
type Verdict = { choice: string; confidence: number; escalate?: boolean; agree?: boolean | null; judge2?: string | null; latency_ms?: number; reasoning?: string; warning?: string; routed_to?: string | null }
type Receipt = { id: string; ts: string; question: string; chosen: string; confidence: number; model?: string; who_proposed?: string; escalate?: boolean }

const GREEN = '#00C853', AMBER = '#F5A524'
const SAMPLE: Record<string, Record<string, unknown>> = {
  model_tier: { prompt: 'a cat', user_tier: 'free', image_size: 1024 },
  product_queue: { subject: 'double charged on bKash', body: 'charged twice', plan: 'free' },
  approval_gate: { tf_diff: '+ resource "aws_vpc" "main"', target_module: 'module/vpc', cost_delta: '+$180/mo' },
  priority: { service_name: 'postgres', downtime: '14m', reboot_history: '3' },
  abuse: { ip: '45.11.2.9', user_agent: 'curl/8', request_path: '/api/v1/chat', rate: '400/min' },
  audit_actor: { action: 'terraform apply', actor: 'self-hosted runner', source: 'github-actions' },
}
const LAYERS = [
  ['1 Gateway', 'ai.hostamar.com:11442 — free_model_router.py', 'PIN 1 model tier (60% rule)'],
  ['2 Tunnel', 'hostamar-prod-new — ai / comfy / browser / hostamar.com', 'decisions.hostamar.com → :8083'],
  ['3 Compute', 'Windows ComfyUI RTX 5060 + WSL Podman pg/redis', 'Jev-Style 0.8B :8085 + prism :18932'],
  ['4 Control Plane', 'PR → plan + OPA + Infracost → approve → apply', 'PIN 3 gate · PIN 6 receipts'],
]

function Badge({ v }: { v: Verdict }) {
  const ok = v.confidence >= 0.6 && !v.escalate
  return (
    <span style={{ background: ok ? GREEN : AMBER, color: '#001b0c', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
      {ok ? <CheckCircle2 size={12} style={{ verticalAlign: -1 }} /> : <AlertTriangle size={12} style={{ verticalAlign: -1 }} />}{' '}
      {ok ? 'auto' : 'Unsure'} · {(v.confidence * 100).toFixed(0)}%
    </span>
  )
}

export default function DecisionsPage() {
  const [pins, setPins] = useState<Record<string, Pin>>({})
  const [out, setOut] = useState<Record<string, Verdict>>({})
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    setBusy(true); setNote('')
    try {
      const cat = await fetch('/api/decision?pins=1', { cache: 'no-store' }).then(r => r.json())
      setPins(cat.pins || {})
      const names = Object.keys(cat.pins || {})
      const acc: Record<string, Verdict> = {}
      for (const n of names) {                       // sequential: one model, be gentle
        const p = cat.pins[n]
        const r = await fetch('/api/decision', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ who: p.who, question: p.question, choices: p.choices, context: SAMPLE[n] || {}, escalate_to: p.fallback }),
        })
        acc[n] = await r.json().catch(() => ({ choice: '?', confidence: 0 }))
        setOut({ ...acc })
      }
      const rec = await fetch('/api/decision', { cache: 'no-store' })
      if (rec.ok) setReceipts(((await rec.json()).receipts || []).slice(0, 12))
      else setNote('receipts need admin login (auth_token) — verdicts above are live')
    } catch (e) {
      setNote('runner error: ' + (e as Error).message)
    }
    setBusy(false)
  }, [])

  useEffect(() => { run() }, [run])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 18px', color: '#e6edf3' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <ShieldCheck color={GREEN} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Decision API — ৬টা PIN, automated</h1>
        <span style={{ opacity: .7, fontSize: 13 }}>Jev-Style 0.8B (open source) · shadow mode · 60% rule</span>
        <button onClick={run} disabled={busy} style={{ marginLeft: 'auto', background: GREEN, border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 700, color: '#001b0c', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ verticalAlign: -2 }} /> {busy ? 'running…' : 'Re-run'}
        </button>
      </header>
      {note && <p style={{ color: AMBER, fontSize: 13 }}>{note}</p>}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12, marginTop: 18 }}>
        {Object.entries(pins).map(([name, p]) => {
          const v = out[name]
          return (
            <article key={name} style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <b style={{ fontSize: 14 }}>{p.id}</b>
                {v ? <Badge v={v} /> : <span style={{ opacity: .5, fontSize: 12 }}>waiting…</span>}
              </div>
              <p style={{ margin: '8px 0 4px', fontSize: 13, opacity: .9 }}>{p.question}</p>
              <p style={{ margin: 0, fontSize: 12, opacity: .65 }}>
                {v ? <>picked <b style={{ color: GREEN }}>{v.choice}</b>{v.latency_ms ? ` · ${v.latency_ms}ms` : ''}
                  {v.agree === true ? ' · two-judge agree' : v.agree === false ? ' · two-judge DISAGREE → Needs Review' : ''}
                  {v.routed_to ? ` · routed to ${v.routed_to}` : ''}{v.warning ? ' · static fallback' : ''}</>
                  : `fallback when unsure: ${p.fallback}`}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, opacity: .45 }}>{p.layer}{p.judges === 2 ? ' · two-judge' : ''}{v?.reasoning ? ` · ${v.reasoning}` : ''}</p>
            </article>
          )
        })}
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 15 }}><Activity size={14} style={{ verticalAlign: -2 }} /> 4-layer flow — every layer now a decision</h2>
        <ol style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
          {LAYERS.map(([l, what, pin]) => (
            <li key={l} style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              <b>{l}</b> — {what} <span style={{ color: GREEN, opacity: .9 }}>· {pin}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 15 }}>Audit receipts (PIN 6) — {receipts.length} latest</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ textAlign: 'left', opacity: .6 }}>
              {['ts', 'who proposed', 'question', 'chosen', 'conf', 'model', '60% rule'].map(h => <th key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #1f2937' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: '4px 8px', opacity: .7 }}>{(r.ts || '').slice(5, 19)}</td>
                  <td style={{ padding: '4px 8px' }}>{r.who_proposed || '—'}</td>
                  <td style={{ padding: '4px 8px' }}>{(r.question || '').slice(0, 46)}</td>
                  <td style={{ padding: '4px 8px', color: GREEN }}>{r.chosen}</td>
                  <td style={{ padding: '4px 8px' }}>{(r.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '4px 8px', opacity: .7 }}>{r.model || '—'}</td>
                  <td style={{ padding: '4px 8px', color: r.escalate ? AMBER : GREEN }}>{r.escalate ? 'escalated' : 'auto'}</td>
                </tr>
              ))}
              {!receipts.length && <tr><td colSpan={7} style={{ padding: 10, opacity: .5 }}>no receipts visible — log in as admin, or the home box is off</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
