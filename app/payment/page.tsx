'use client'

import { useState, useEffect } from 'react'

type PaymentMethod = {
  name: string
  number?: string
  address?: string
  network?: string
}

export default function PersonalPaymentPage() {
  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({})
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [transactionId, setTransactionId] = useState('')
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('starter')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/payment/personal')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMethods(d.methods)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/payment/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          transactionId,
          amount,
          customerEmail: email,
          plan,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        setTransactionId('')
        setAmount('')
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Send Payment</h1>
        <p className="text-gray-400 mb-8">
          Send money via bKash, Nagad, Rocket, or USDT. No business account needed — personal send money only.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(methods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => setSelectedMethod(key)}
              className={`p-4 rounded-xl border text-left transition ${
                selectedMethod === key
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-white font-medium">{method.name}</div>
              {method.number && (
                <div className="text-gray-400 text-sm mt-1 font-mono">{method.number}</div>
              )}
              {method.address && (
                <div className="text-gray-400 text-sm mt-1 font-mono">
                  {method.network}: {method.address.slice(0, 12)}...{method.address.slice(-8)}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedMethod && (
          <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Enter transaction ID from your payment app"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount (BDT)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="299"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                <option value="starter">Starter — ৳299/mo</option>
                <option value="growth">Growth — ৳599/mo</option>
                <option value="pro">Pro — ৳999/mo</option>
              </select>
            </div>

            {message && <div className="text-emerald-400 text-sm">{message}</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition"
            >
              {loading ? 'Submitting...' : 'Submit Payment Notification'}
            </button>
          </form>
        )}

        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <h3 className="text-amber-400 font-medium mb-2">How it works</h3>
          <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
            <li>Select your preferred payment method above</li>
            <li>Send money using your mobile app (bKash/Nagad/Rocket) or Binance P2P (USDT)</li>
            <li>Copy the transaction ID from your payment app</li>
            <li>Fill in the form and submit</li>
            <li>We verify and activate your subscription within 24 hours</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
