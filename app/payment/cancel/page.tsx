import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Payment Cancelled | Hostamar',
  description:
    'Your Hostamar payment was cancelled. No charges were made. You can try again or choose a different payment method.',
  robots: { index: false, follow: false },
}

export default function CancelPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-yellow-500/30 bg-gray-800 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏸️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
        <p className="text-gray-400 mb-6">
          You cancelled the payment. No charges were made.
        </p>
        <Link
          href="/payment"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Back to Plans
        </Link>
      </div>
    </main>
  )
}
