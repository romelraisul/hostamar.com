'use client'
import { useState } from 'react'

export default function Billing() {
  const [product, setProduct] = useState('agent-cloud')
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Hostamar Billing — bKash + Stripe + Medusa</h1>
      <p className="text-sm opacity-70 mt-2">
        Agent Cloud $49/mo (5400 BDT) | Video OS $0.10/min (12 BDT/min) | GPU Spot RTX $0.20/h (22 BDT) H100 $1.5/h (165 BDT). First 10 customers get lifetime 20% off.
      </p>
      <div className="mt-4 flex gap-2">
        <select value={product} onChange={(e) => setProduct(e.target.value)} className="border rounded p-2">
          <option value="agent-cloud">Agent Cloud $49/mo</option>
          <option value="video-os">Video OS $0.10/min</option>
          <option value="gpu-spot">GPU Spot RTX $0.20/h</option>
        </select>
        <button
          onClick={async () => {
            const r = await fetch('/api/billing/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product, customer: 'demo' }),
            })
            const d = await r.json()
            alert(JSON.stringify(d, null, 2))
          }}
          className="bg-black text-white px-4 rounded"
        >
          Checkout
        </button>
      </div>
      <div className="mt-4 text-xs">
        V52: 23 jobs | OmniRoute nemotron-3-nano LIVE | Gateway 166 brand | Fleet 19 assigned | Drive 1499 Turso TG 1563 Upstash 52
      </div>
    </div>
  )
}
