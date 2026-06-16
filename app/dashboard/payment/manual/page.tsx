'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, ArrowLeft, CheckCircle2, Clock, ArrowRight } from 'lucide-react'

/**
 * ManualPaymentForm — Phase 0.3 payment form for bKash/Nagad/Rocket/USDT.
 * Until we have a bKash Payment Gateway merchant account (Phase 1), users send
 * money to our bKash/Nagad numbers manually and submit a TrxId. Admin verifies
 * via the bearer-token API endpoint. The user's video generating status, etc.
 * become "active" once admin verifies.
 *
 * This page intentionally lives at /dashboard/payment/manual so the bKash-PG
 * flow at /dashboard/payment (Phase 1) can be a separate, parallel page
 * (Phase 1 = automatic via QR; Phase 0.3 = manual via TrxId submit).
 */

const MERCHANT_NUMBERS = {
  bkash: { number: process.env.NEXT_PUBLIC_BKASH_NUMBER || '01822417463', name: 'bKash Personal' },
  nagad: { number: process.env.NEXT_PUBLIC_NAGAD_NUMBER || '01711317101', name: 'Nagad Personal' },
  rocket:{ number: process.env.NEXT_PUBLIC_ROCKET_NUMBER || '018224174630', name: 'Rocket' },
  usdt:  { address: process.env.NEXT_PUBLIC_USDT_ADDRESS || '0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858', network: 'BSC (BEP20)' },
}

const PLANS = [
  { key: 'starter',   name: 'Starter',   price: 2000,  cycle: '1 month' },
  { key: 'business',  name: 'Business',  price: 3500,  cycle: '1 month' },
  { key: 'enterprise',name: 'Enterprise',price: 6000,  cycle: '1 month' },
]

const METHODS = [
  { key: 'bkash',  label: 'bKash',  color: 'bg-pink-500',   border: 'border-pink-300',  text: 'text-pink-700' },
  { key: 'nagad',  label: 'Nagad',  color: 'bg-orange-500', border: 'border-orange-300',text: 'text-orange-700' },
  { key: 'rocket', label: 'Rocket', color: 'bg-purple-500', border: 'border-purple-300',text: 'text-purple-700' },
  { key: 'usdt',   label: 'USDT',   color: 'bg-emerald-500',border: 'border-emerald-300',text: 'text-emerald-700' },
]

export default function ManualPaymentPage() {
  // Search params via query string in future — for now pick via state
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string>('starter')
  const [selectedMethod, setSelectedMethod] = useState<string>('bkash')
  const [trxId, setTrxId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const plan = PLANS.find((p) => p.key === selectedPlan)
  const method = METHODS.find((m) => m.key === selectedMethod)

  const copyNumber = async () => {
    const value = MERCHANT_NUMBERS[selectedMethod as keyof typeof MERCHANT_NUMBERS]
    const text = 'number' in value ? value.number : value.address
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!trxId.trim()) {
      setError('অনুগ্রহ করে লেনদেন আইডি (TrxID) লিখুন')
      return
    }
    if (!plan) {
      setError('প্ল্যান নির্বাচন করুন')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/manual-payments/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          method: selectedMethod,
          trxId: trxId.trim(),
          amount: plan.price,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ত্রুটি হয়েছে, আবার চেষ্টা করুন')
        return
      }
      setSuccess(data.message || 'যাচাই হচ্ছে...')
      setTrxId('')
      setAmount('')
    } catch {
      setError('নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন')
    } finally {
      setSubmitting(false)
    }
  }

  // success state shows confirmation card
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            পেমেন্ট যাচাই হচ্ছে
          </h1>
          <p className="text-gray-700 mb-6">{success}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <div className="font-semibold mb-1">সময়সীমা</div>
                সাধারণত ১ ঘণ্টার মধ্যে আপনার অ্যাকাউন্ট সক্রিয় হয়ে যাবে।
                সমস্যা হলে WhatsApp-এ যোগাযোগ করুন।
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="block w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800"
          >
            ড্যাশবোর্ডে ফিরে যান
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Link
          href="/dashboard/payment"
          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>অন্য পেমেন্ট পদ্ধতি</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <header className="mb-6">
            <div className="inline-block mb-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              ম্যানুয়াল পেমেন্ট
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              ম্যানুয়াল পেমেন্ট
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              বিকাশ / নগদ / রকেট / USDT-এ পেমেন্ট করুন, তারপর নিচের ফর্মে লেনদেন আইডি দিন
            </p>
          </header>

          {/* plan picker */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ১. প্ল্যান নির্বাচন
            </label>
            <div className="grid sm:grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPlan(p.key)}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    selectedPlan === p.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">৳{p.price}</div>
                  <div className="text-xs text-gray-500">{p.cycle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* method picker */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ২. পেমেন্ট পদ্ধতি
            </label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMethod(m.key)}
                  className={`p-3 border-2 rounded-lg text-center transition-colors ${
                    selectedMethod === m.key
                      ? `border-current ${m.color} text-white`
                      : `border-gray-200 hover:border-gray-300 ${m.text}`
                  }`}
                >
                  <div className="font-bold text-sm">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* merchant number */}
          <div className="mb-5 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2">
              ৩. এই নম্বরে টাকা পাঠান
            </label>
            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-100">
              <code className="flex-1 text-lg font-mono font-bold text-gray-900">
                {MERCHANT_NUMBERS[
                  selectedMethod as keyof typeof MERCHANT_NUMBERS
                ] && ('number' in MERCHANT_NUMBERS[
                  selectedMethod as keyof typeof MERCHANT_NUMBERS
                ]
                  ? MERCHANT_NUMBERS[selectedMethod as keyof typeof MERCHANT_NUMBERS].number
                  : ''
                )}
              </code>
              {selectedMethod !== 'usdt' && (
                <button
                  type="button"
                  onClick={copyNumber}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  {copied ? 'কপি হয়েছে ✓' : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            {selectedMethod === 'usdt' && (
              <div className="mt-2 bg-white rounded-lg p-3 border border-blue-100">
                <div className="text-xs font-semibold text-blue-900 mb-1">
                  USDT {MERCHANT_NUMBERS.usdt.network}
                </div>
                <code className="text-xs font-mono break-all text-gray-700">
                  {MERCHANT_NUMBERS.usdt.address}
                </code>
              </div>
            )}
            <div className="text-xs text-blue-700 mt-2">
              টাকা পাঠান <b>৳{plan?.price}</b> · রেফারেন্সে আপনার ইমেইল লিখুন
            </div>
          </div>

          {/* trxId form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ৪. লেনদেন আইডি লিখুন (TrxID / Reference)
              </label>
              <input
                type="text"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                placeholder="যেমন: ABC123XYZ"
                autoComplete="off"
                disabled={submitting}
                className="w-full bg-white border-2 border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting ? 'পাঠানো হচ্ছে...' : 'পেমেন্ট যাচাইয়ের জন্য পাঠান'}
              {!submitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            পেমেন্ট যাচাই হলে আপনি ইমেইল পাবেন এবং ড্যাশবোর্ডে "সাবস্ক্রিপশন সক্রিয়" দেখাবে
          </p>
        </div>
      </div>
    </div>
  )
}
