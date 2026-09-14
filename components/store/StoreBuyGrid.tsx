'use client'

/**
 * StoreBuyGrid — real 2-click buy from the Medusa catalog (FORGE, 2026-09-14).
 * Click 1: "অর্ডার করো" opens the order form. Click 2: "অর্ডার কনফার্ম" POSTs
 * /api/store/checkout (server bridge: cart→line-item→address→shipping→
 * payment-session→complete + order-placed notification). No login, no signup
 * wall — the whole point of the manual send-money path (BINDING 2026-09-14).
 * Products come from /api/store/products (variantId + BDT, nothing else exposed them).
 */
import { useEffect, useState } from 'react'

const GREEN = '#0E7C3A'
const BKASH = '01822417463'

interface Prod { id: string; title: string; variantId: string; amountBdt: number }
type Phase = 'idle' | 'submitting' | 'done' | 'error'

export default function StoreBuyGrid() {
  const [prods, setProds] = useState<Prod[]>([])
  const [open, setOpen] = useState<Prod | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [orderId, setOrderId] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/store/products')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const list: Prod[] = (d.products || []).filter((p: Prod) => p.amountBdt > 0)
        // Top priced first; 12 flagship items max (the 110 clone-services share a slot).
        setProds(list.sort((a, b) => b.amountBdt - a.amountBdt).slice(0, 12))
      })
      .catch(() => setProds([]))
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!open) return
    const f = new FormData(e.currentTarget)
    setPhase('submitting')
    setErr('')
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: open.variantId,
          email: f.get('email'),
          name: f.get('name'),
          address1: f.get('address1'),
          city: f.get('city'),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Checkout unavailable')
      setOrderId(d.orderId || '')
      setPhase('done')
    } catch (e: any) {
      setErr(e?.message || 'Checkout unavailable')
      setPhase('error')
    }
  }

  if (!prods.length) return null

  return (
    <div className="mt-12">
      <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>লাইভ অর্ডার — মেডুসা ক্যাটালগ</div>
      <h2 className="text-2xl font-bold mt-2">২ ক্লিকে অর্ডার — লগইন লাগবে না</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {prods.map((p) => (
          <div key={p.variantId} className="rounded-2xl border bg-white p-5 flex flex-col justify-between gap-4">
            <div className="font-bold text-sm leading-snug">{p.title}</div>
            <div>
              <div className="font-extrabold" style={{ color: GREEN }}>৳{p.amountBdt.toLocaleString('en-BD')}</div>
              <button
                onClick={() => { setOpen(p); setPhase('idle'); setErr('') }}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                style={{ background: GREEN }}
              >
                অর্ডার করো →
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog" aria-modal="true" aria-label={`অর্ডার: ${open.title}`}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(null) }}
        >
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-sm">{open.title}</div>
                <div className="font-extrabold mt-1" style={{ color: GREEN }}>৳{open.amountBdt.toLocaleString('en-BD')}</div>
              </div>
              <button onClick={() => setOpen(null)} aria-label="বন্ধ করুন" className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">✕</button>
            </div>

            {phase === 'done' ? (
              <div className="mt-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-4 text-sm">
                <div className="font-bold text-[#15803D]">অর্ডার # taken ✓</div>
                <div className="mt-1">অর্ডার আইডি: <code className="text-xs">{orderId}</code></div>
                <div className="mt-1 text-xs text-gray-600">রসিদ আপনার ইমেইলে পাঠানো হয়েছে।</div>
                <div className="mt-2 text-gray-700">
                  এখন <b>Send Money</b> (Cash Out নয়): bKash/Nagad/Rocket <b>{BKASH}</b> → ৳{open.amountBdt.toLocaleString('en-BD')}।
                  পাঠানোর ৫ মিনিটের মধ্যে অর্ডার কনফার্ম হয়ে যাবে।
                </div>
                <button onClick={() => setOpen(null)} className="mt-3 w-full rounded-full px-4 py-2 text-xs font-bold text-white" style={{ background: GREEN }}>
                  বন্ধ করো
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3 text-sm">
                <input name="name" required maxLength={80} placeholder="আপনার নাম" className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#0E7C3A]" />
                <input name="email" required type="email" placeholder="ইমেইল (রসিদ এখানে আসবে)" className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#0E7C3A]" />
                <input name="address1" required maxLength={200} placeholder="ঠিকানা" className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#0E7C3A]" />
                <input name="city" required maxLength={60} defaultValue="Dhaka" className="w-full rounded-xl border px-3 py-2 outline-none focus:border-[#0E7C3A]" />
                {phase === 'error' && <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-700">{err}</div>}
                <button
                  type="submit"
                  disabled={phase === 'submitting'}
                  className="w-full rounded-full px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: GREEN }}
                >
                  {phase === 'submitting' ? 'অর্ডার হচ্ছে…' : `অর্ডার কনফার্ম — ৳${open.amountBdt.toLocaleString('en-BD')}`}
                </button>
                <p className="text-[11px] text-zinc-500">
                  অর্ডার করার পর bKash/Nagad/Rocket Send Money ({BKASH}) — TrxID হলেই কাজ শুরু। কার্ড লাগবে না।
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
