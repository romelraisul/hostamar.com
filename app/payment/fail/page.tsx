// Server Component — exports metadata directly (no "use client")
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Payment Failed | Hostamar',
  description:
    'Your Hostamar payment was not completed. Please try again or use an alternative payment method. Contact support if the issue persists.',
  alternates: { canonical: 'https://hostamar.com/payment/fail' },
  openGraph: {
    title: 'Payment Failed | Hostamar',
    description: 'Your Hostamar payment was not completed. Please try again or use an alternative payment method.',
    url: 'https://hostamar.com/payment/fail',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Payment Failed | Hostamar',
    description: 'Your Hostamar payment was not completed. Please try again.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  robots: { index: false, follow: false },
}

export default function FailPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-gray-800 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
        <p className="text-gray-400 mb-6">
          The transaction was not completed. Please try again.
        </p>
        <Link
          href="/payment"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Try Again
        </Link>
      </div>
    </main>
  )
}
