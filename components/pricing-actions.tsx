'use client'

// The ONLY client JS on /pricing — bKash TrxID verify + Stripe/PayPal
// checkout buttons. Everything else (prices, USD strings, banners) renders
// server-side. Billing rules preserved verbatim from the old all-client page:
// /api/billing/create-checkout and /api/billing/verify-trx (V17: credits are
// granted on approval, never claimed client-side).

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toBn, type Plan } from '@/lib/pricing'

const BKASH = '#E2136E'
const STRIPE = '#635BFF'

type TrxState = 'idle' | 'verifying' | 'success' | 'error'

export function TrxVerify({ plan, credits }: { plan: Plan; credits: number }) {
  const [trx, setTrx] = useState('')
  const [state, setState] = useState<TrxState>('idle')
  const [msg, setMsg] = useState('')

  async function verify() {
    if (!trx.trim()) { setMsg('ট্রানজেকশন আইডি দিন'); setState('error'); return }
    setState('verifying')
    setMsg('TrxID যাচাই হচ্ছে…')
    try {
      // V17: REAL verification only — /api/billing/verify-trx records the
      // TrxID for admin/SMS approval. Credits are granted on approval, NEVER
      // claimed client-side. No demo/fake-success branch anymore.
      const res = await fetch('/api/billing/verify-trx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trxId: trx.trim(), plan: plan.id }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && (data?.ok || data?.success)) {
        setState('success')
        setMsg(data?.message || `TrxID গৃহীত — অনুমোদনের পর ${toBn(credits)} ক্রেডিট যোগ হবে`)
      } else {
        setState('error')
        setMsg(data?.error || 'TrxID যাচাই ব্যর্থ — আবার চেষ্টা করুন')
      }
    } catch {
      setState('error')
      setMsg('যাচাই ব্যর্থ — আবার চেষ্টা করুন')
    }
  }

  return (
    <div className="bp-trx">
      <p className="bp-trx-label">bKash ট্রানজেকশন যাচাই</p>
      <div className="bp-trx-row">
        <input
          value={trx}
          onChange={e => { setTrx(e.target.value); if (state !== 'idle') setState('idle') }}
          placeholder="ট্রানজেকশন আইডি লিখুন"
          className="bp-trx-input"
        />
        <button
          onClick={verify}
          disabled={state === 'verifying'}
          className="bp-trx-btn"
          style={{ background: BKASH }}
        >
          {state === 'verifying' ? (
            <span className="bp-trx-loading"><Loader2 className="bp-trx-spin" size={14} aria-hidden="true" /> যাচাই হচ্ছে...</span>
          ) : 'যাচাই করুন'}
        </button>
      </div>
      {state === 'success' && <p className="bp-trx-ok">{msg}</p>}
      {state === 'error' && <p className="bp-trx-err">{msg}</p>}
    </div>
  )
}

export function CheckoutButtons({ planId }: { planId: Plan['id'] }) {
  const [busy, setBusy] = useState(false)

  async function startStripe() {
    setBusy(true)
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json().catch(() => null)
      if (data?.url || data?.stripeUrl) {
        window.location.href = data.url || data.stripeUrl
        return
      }
      if (data?.bkashURL) {
        window.location.href = data.bkashURL
        return
      }
      window.location.href = `/signup?plan=${planId}`
    } catch {
      window.location.href = `/signup?plan=${planId}`
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={startStripe}
        disabled={busy}
        className="bp-btn"
        style={{ background: STRIPE, color: '#fff' }}
      >
        {busy ? 'প্রসেস হচ্ছে…' : 'Pay with Stripe'}
      </button>
      <button
        onClick={startStripe}
        disabled={busy}
        className="bp-btn"
        style={{ background: '#FFC439', color: '#0F172A', borderColor: '#E2B500' }}
      >
        Pay with PayPal
      </button>
    </>
  )
}
