'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from '@/lib/locale-context'

// ============================================================================
// CheckoutButton
// Full manual-payment flow against the existing API:
//   1. POST /api/payment/create        -> creates order, returns trxId + instructions
//   2. User does bKash/Nagad/Rocket "Send Money" with the trxId as reference
//   3. Poll GET /api/payments/status/[transactionId] until completed / failed
// No merchant creds required — this drives the live manual fallback.
// ============================================================================

type PlanKey = 'starter' | 'business' | 'enterprise'
type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'usdt'

type CreateResponse = {
  success?: boolean
  trxId?: string
  plan?: string
  amount?: number
  currency?: string
  method?: PaymentMethod
  paymentUrl?: string | null
  instructions?: string[]
  status?: string
  error?: string
}

type StatusResponse = {
  success?: boolean
  transactionId?: string
  status?: 'pending' | 'completed' | 'failed'
  error?: string
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'bkash', label: 'bKash' },
  { key: 'nagad', label: 'Nagad' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'usdt', label: 'USDT (BEP20)' },
]

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 15 * 60 * 1000 // stop polling after 15 min

export interface CheckoutButtonProps {
  plan: PlanKey
  className?: string
  label?: string
}

export default function CheckoutButton({ plan, className, label }: CheckoutButtonProps) {
  const { t } = useLocale()

  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('bkash')
  const [phone, setPhone] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<CreateResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStart = useRef<number>(0)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  // Clean up on unmount.
  useEffect(() => () => stopPolling(), [stopPolling])

  const pollStatus = useCallback(
    async (trxId: string) => {
      try {
        const res = await fetch(`/api/payments/status/${encodeURIComponent(trxId)}`, {
          cache: 'no-store',
        })
        if (!res.ok) return // 404 while still 'pending' upsert lag — keep polling
        const data: StatusResponse = await res.json()
        if (data.status === 'completed') {
          setStatus('completed')
          stopPolling()
        } else if (data.status === 'failed') {
          setStatus('failed')
          stopPolling()
        }
      } catch {
        // transient network error — keep polling
      }
      if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) {
        stopPolling()
      }
    },
    [stopPolling],
  )

  const startPolling = useCallback(
    (trxId: string) => {
      stopPolling()
      pollStart.current = Date.now()
      pollTimer.current = setInterval(() => void pollStatus(trxId), POLL_INTERVAL_MS)
      void pollStatus(trxId)
    },
    [pollStatus, stopPolling],
  )

  const handleCreate = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          method,
          ...(method !== 'usdt' ? { phone } : {}),
          ...(method === 'usdt' ? { walletAddress } : {}),
        }),
      })
      const data: CreateResponse = await res.json()
      if (!res.ok || !data.success || !data.trxId) {
        setError(data.error || 'Failed to create payment order')
        return
      }
      setOrder(data)
      setStatus('pending')
      startPolling(data.trxId)
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [plan, method, phone, walletAddress, startPolling])

  const reset = useCallback(() => {
    stopPolling()
    setOrder(null)
    setStatus('idle')
    setError(null)
    setPhone('')
    setWalletAddress('')
    setOpen(false)
  }, [stopPolling])

  const btnLabel = label || t('nav.startFree') || 'Get Started'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-block w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-center font-semibold text-white transition hover:opacity-90'
        }
      >
        {btnLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && reset()}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold capitalize">{plan} — Checkout</h3>
              <button
                type="button"
                onClick={reset}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Step 1: choose method */}
            {!order && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Payment method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMethod(m.key)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          method === m.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {method !== 'usdt' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Your mobile number</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Your wallet address (BEP20)</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? 'Creating order…' : 'Continue to payment'}
                </button>
              </div>
            )}

            {/* Step 2: instructions + live status */}
            {order && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold">
                      ৳{order.amount?.toLocaleString()} {order.currency}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-slate-500">Reference (TrxID)</span>
                    <span className="font-mono font-semibold">{order.trxId}</span>
                  </div>
                </div>

                {order.instructions && (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {order.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}

                {/* Live status */}
                <div className="rounded-lg border p-3 text-sm dark:border-slate-700">
                  {status === 'pending' && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                      Waiting for payment confirmation… (auto-checks every 5s)
                    </div>
                  )}
                  {status === 'completed' && (
                    <div className="flex items-center gap-2 font-semibold text-green-600">
                      ✓ Payment confirmed! Your plan is now active.
                    </div>
                  )}
                  {status === 'failed' && (
                    <div className="flex items-center gap-2 font-semibold text-red-600">
                      ✕ Payment failed or was rejected. Please contact support.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {status === 'completed' ? 'Done' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
