// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import CryptoPaymentPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Crypto Payment | Hostamar Dashboard',
  description:
    'Pay your Hostamar subscription with cryptocurrency (USDT, BTC, ETH). Secure crypto payment gateway with real-time confirmation.',
  robots: { index: false, follow: false },
}

export default function CryptoPaymentPage() {
  return <CryptoPaymentPageClient />
}
