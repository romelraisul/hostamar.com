'use client'

/**
 * Binance P2P rate banner + BDT/USD toggle + $HOSTA teaser.
 * Fetches live rate from /api/binance-price (Binance P2P → CoinGecko fallback).
 */

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'

type RateData = {
  usdtBdt: number
  source: string
  welcome: { credits: number; taka: number; usd: number }
  plans: Record<string, { priceTaka: number; priceUsd: number }>
}

export function useBinanceRate() {
  const [rate, setRate] = useState<RateData | null>(null)
  useEffect(() => {
    fetch('/api/binance-price')
      .then((r) => r.json())
      .then(setRate)
      .catch(() => {})
  }, [])
  return rate
}

export function usd(taka: number, usdtBdt: number): string {
  return `$${(taka / usdtBdt).toFixed(2)}`
}

/** Live-rate badge: green dot + "Binance P2P: 122.78 BDT" */
export function BinanceBadge({ rate }: { rate: RateData | null }) {
  if (!rate) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-xs font-medium text-[#0E7C3A]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E7C3A] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E7C3A]" />
      </span>
      Live Binance P2P: 1 USDT ≈ {rate.usdtBdt} BDT — not bank rate
    </span>
  )
}

/**
 * Welcome banner: "Create account and get 6000 Taka ($48.86 USD)".
 */
export function WelcomeBanner() {
  const rate = useBinanceRate()
  return (
    <div className="rounded-2xl border border-[#0E7C3A]/25 bg-gradient-to-r from-[#0E7C3A]/8 to-transparent p-5">
      <p className="text-lg font-bold text-[#0F172A]">
        Create account and get{' '}
        <span className="text-[#0E7C3A]">6000 Taka</span>{' '}
        {rate && <span className="text-base font-semibold text-slate-500">≈ ${rate.welcome.usd} USD</span>}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Chat with 100+ AI models, generate videos, host servers. No card needed.
      </p>
      {rate && (
        <p className="mt-2 text-xs text-slate-500">
          6000 Taka = 6000 GPT-4o-mini chats · or 40 videos · or 10 months Starter hosting
        </p>
      )}
    </div>
  )
}

/**
 * $HOSTA teaser — credits are pre-mine, 1:1 conversion.
 */
export function HostaTeaser() {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-[#F59E0B]/50 bg-amber-50/40 p-6 text-center">
      <Coins className="mx-auto mb-2 h-6 w-6 text-[#F59E0B]" />
      <h3 className="text-lg font-bold">
        Future $HOSTA Coin — your credits convert 1:1
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
        1 Credit = 1 Taka ≈ 0.008 USDT (Binance P2P pegged). Total supply 1B $HOSTA.
        Your credits are the pre-mine — every Taka you spend today becomes $HOSTA at listing.
      </p>
    </div>
  )
}
