'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Coins, Play } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

type BalanceResponse = {
  success: boolean
  credits: number
  balance: number
}

type SpinResponse = {
  success: boolean
  reels: string[]
  bet: number
  won: boolean
  multiplier: number
  amount: number
  message: string
  credits: number
  balance: number
}

const REEL_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎']

export default function SlotMachinePage() {
  const { t } = useLocale()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [credits, setCredits] = useState(1000)
  const [balance, setBalance] = useState(0)
  const [bet, setBet] = useState(10)
  const [message, setMessage] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [token, setToken] = useState('')
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const value = document.cookie.split('; ').find((c) => c.startsWith('auth_token='))?.split('=')[1]
    if (value) {
      setToken(value)
    } else {
      setAuthError(true)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    refreshBalance()
  }, [token])

  const refreshBalance = async () => {
    try {
      const res = await fetch('/api/game/balance', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
      })
      const data = (await res.json()) as BalanceResponse
      if (data.success) {
        setCredits(data.credits)
        setBalance(data.balance)
      }
    } catch {
      // keep default
    }
  }

  const spin = async () => {
    if (spinning) return
    setSpinning(true)
    setMessage('Spinning...')
    const seed = Date.now()
    try {
      const res = await fetch('/api/game/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ bet, seed }),
      })

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string }
        setMessage(errorData.error || 'Spin failed')
        setSpinning(false)
        return
      }

      const data = (await res.json()) as SpinResponse
      await animateReels(data.reels)
      setCredits(data.credits)
      setBalance(data.balance)
      setMessage(data.message)
    } catch {
      setMessage('Network error')
    } finally {
      setSpinning(false)
    }
  }

  const drawCanvas = (reels: string[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#0b0517'
    ctx.fillRect(0, 0, width, height)

    const cols = 3
    const rows = 3
    const cellWidth = width / cols
    const cellHeight = height / rows

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 2

    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const symbol = reels[col] ?? REEL_SYMBOLS[0]
        const x = col * cellWidth + cellWidth / 2
        const y = row * cellHeight + cellHeight / 2 + 2

        ctx.save()
        ctx.shadowColor = 'rgba(168,85,247,0.6)'
        ctx.shadowBlur = 18
        ctx.fillStyle = '#ffffff'
        ctx.fillText(symbol, x, y)
        ctx.restore()

        ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
      }
    }
  }

  const animateReels = async (finalReels: string[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cols = 3
    const totalFrames = 24 + cols * 6
    let frame = 0

    const run = () => {
      frame += 1
      const tempSymbols = Array.from({ length: cols }).map((_, col) => {
        if (Math.floor(frame / (8 + col * 6)) > 0 && col < Math.floor((frame - 1) / (10 + col * 6)) + 1) {
          return finalReels[col] ?? REEL_SYMBOLS[0]
        }
        return REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)]
      })
      drawCanvas(tempSymbols)
      if (frame < totalFrames) {
        requestAnimationFrame(run)
      } else {
        drawCanvas(finalReels)
      }
    }

    requestAnimationFrame(run)
  }

  useEffect(() => {
    drawCanvas(Array.from({ length: 3 }).map(() => REEL_SYMBOLS[0]))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/game" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            LuckyStar Game
          </div>
          <div className="ml-auto flex gap-3 items-center">
            <span className="text-sm text-gray-400">Credits</span>
            <span className="text-sm font-semibold text-yellow-300 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {credits}
            </span>
            <span className="text-sm text-gray-600">|</span>
            <span className="text-sm text-gray-400">BDT</span>
            <span className="text-sm font-semibold text-emerald-300">{balance}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="grid md:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/40 p-1 md:p-2">
                <canvas ref={canvasRef} width={640} height={300} className="w-full h-auto rounded-lg" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <label className="text-xs text-gray-400">Bet</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="w-20 bg-transparent text-right outline-none"
                  />
                </div>
                <button
                  disabled={spinning}
                  onClick={spin}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                >
                  {spinning ? (
                    'Spinning...'
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Spin
                    </>
                  )}
                </button>
              </div>

              {message ? <div className="text-center text-sm font-medium text-gray-200">{message}</div> : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Payouts</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>🍒 🍒 🍒</span><span className="text-yellow-300">10x</span></div>
                  <div className="flex justify-between"><span>🍋 x2 🍋</span><span className="text-yellow-300">2x</span></div>
                  <div className="flex justify-between"><span>🍇 x2 🍇</span><span className="text-yellow-300">4x</span></div>
                  <div className="flex justify-between"><span>🔔 x2 🔔</span><span className="text-yellow-300">3x</span></div>
                  <div className="flex justify-between"><span>⭐ x2 ⭐</span><span className="text-yellow-300">3x</span></div>
                  <div className="flex justify-between"><span>💎 x3 💎</span><span className="text-yellow-300">50x</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Last Spin</div>
                <div className="text-xs text-gray-300">
                  Match 2 of a kind for a small win. Match 3 for a bigger win. Diamonds pay the most.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}