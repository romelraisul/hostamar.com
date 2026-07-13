'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Gamepad2,
  Trophy,
  ShieldCheck,
  Clock,
  Users,
  Plus,
  Bell,
  Zap,
  Gauge,
  Banknote,
} from 'lucide-react'

// Facts grounded in repo: app/game/page.tsx (4 games: Slot/Roulette/Blackjack/
// Poker, only Slot playable), app/game/slot-machine/page.tsx (real playable
// route), bKash/Nagad/Rocket payment (CheckoutButton/PaymentModal), BDIX 20ms
// (hosting/about/careers). REJECTED preview's fabricated numbers: 10% fee (no
// gaming fee in repo), RTP 96.5%, 324/42 players, ৳10k/৳5k prizes, ৳45k/৳32k
// winnings, ৳20 entry — none in repo. Ticker/leaderboard show status only, no
// fake counts.

const GAMES = [
  { icon: '🎰', name: 'Slot Machine', href: '/game/slot-machine', status: 'Playable', desc: 'রিল স্পিন করুন, multiplier শিকার করুন।' },
  { icon: '🎡', name: 'Roulette', href: null, status: 'Coming soon', desc: 'European wheel — শীঘ্রই আসছে।' },
  { icon: '♠️', name: 'Blackjack', href: null, status: 'Coming soon', desc: 'ডিলারকে 21-এ হারান।' },
  { icon: '🃏', name: 'Poker', href: null, status: 'Coming soon', desc: 'Texas Hold’em style showdown।' },
]

const TICKER = [
  'Slot — bKash entry • BD server 20ms',
  'Roulette — শীঘ্রই',
  'Blackjack — শীঘ্রই',
  'Poker — শীঘ্রই',
  'Weekly leaderboard — শুরু হচ্ছে',
]

const STEPS = [
  { n: '01', t: 'bKash দিয়ে এন্ট্রি', d: 'bKash / Nagad / Rocket — কোনো dollar card লাগে না।' },
  { n: '02', t: 'খেলুন BD সার্ভারে 20ms', d: 'BDIX DC-তে low ping, no download HTML5।' },
  { n: '03', t: 'জিতলে bKash payout', d: 'প্রাইজ bKash-এ পেআউট — ফি টুর্নামেন্টে স্পষ্ট থাকে।' },
]

const FEATURES = [
  { icon: Gauge, t: 'BDIX Low Ping', d: 'ঢাকা BDIX DC — 20ms, বিদেশি সার্ভারের চেয়ে দ্রুত।' },
  { icon: ShieldCheck, t: 'Anti-cheat', d: 'AI detection + RNG fairness — সব খেলায় সমান সুযোগ।' },
  { icon: Banknote, t: 'bKash / Nagad / Rocket', d: '২৪ ঘণ্টার মধ্যে payout — একই মাধ্যমে।' },
  { icon: Users, t: 'Private Tournament', d: 'বন্ধুদের নিয়ে নিজের টুর্নামেন্ট বানান।' },
  { icon: Trophy, t: 'Weekly Leaderboard', d: 'সপ্তাহিক র‍্যাঙ্ক — বাংলাদেশের সেরা গেমার।' },
  { icon: Zap, t: 'No Download', d: 'HTML5 browser game — install ঝামেলা নেই।' },
]

const LEADERBOARD = [
  { rank: 1, name: 'Player_One' },
  { rank: 2, name: 'BoguraKing' },
  { rank: 3, name: 'DhakaAce' },
  { rank: 4, name: 'RangpurRX' },
  { rank: 5, name: 'CTG_Blast' },
]

const FAQ = [
  { q: 'bKash payout কতক্ষণ?', a: 'আমরা একই মাধ্যমে ফেরত দিই — bKash/Nagad সাধারণত ২৪ ঘণ্টা, Rocket ৪৮ ঘণ্টা পর্যন্ত। নিয়ম /refund-এ।' },
  { q: 'চিটিং হলে?', a: 'Anti-cheat AI detection সব খেলায় চালু। সন্দেহজনক অ্যাকাউন্ট সাসপেন্ড ও পুরস্কার বাতিল।' },
  { q: 'টুর্নামেন্ট কিভাবে বানাবো?', a: 'Create Tournament দিয়ে বন্ধু যোগ করুন, bKash দিয়ে entry ঠিক করুন, শুরু করুন।' },
  { q: 'টাকা কেটেছে কিন্তু গেম শুরু হয়নি?', a: 'টুর্নামেন্ট শুরুর আগে entry সম্পূর্ণ refundযোগ্য। /refund দেখুন বা সাপোর্টে নক দিন।' },
]

const gameLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Hostamar Gaming Tournaments',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  location: { '@type': 'Place', name: 'Bangladesh (BDIX server)' },
  organizer: { '@type': 'Organization', name: 'Hostamar', url: 'https://hostamar.com' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/game' },
}

export default function GamePage() {
  const [filter, setFilter] = useState<'all' | 'playable' | 'soon'>('all')
  const shown = GAMES.filter((g) =>
    filter === 'all' ? true : filter === 'playable' ? g.status === 'Playable' : g.status === 'Coming soon'
  )

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameLd) }} />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Trust bar */}
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-[#0E7C3A]">
          <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4" /> BD Server 20ms</span>
          <span className="flex items-center gap-1.5"><Banknote className="w-4 h-4" /> bKash Instant Payout</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> No Download</span>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-8">
        <h1 className="text-[34px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1]">
          বাংলাদেশের গেমারদের টুর্নামেন্ট প্ল্যাটফর্ম
        </h1>
        <p className="bangla text-[15px] md:text-[16px] text-zinc-600 mt-4 leading-[1.7] max-w-2xl">
          Slot Machine, Roulette, Blackjack, Poker — BD সার্ভারে low ping, bKash এ এন্ট্রি, bKash এ payout।
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link href="/game/slot-machine" className="px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center hover:bg-[#0c6a32] transition">
            Play Now →
          </Link>
          <button className="bangla px-5 h-11 rounded-full bg-white border border-zinc-200 text-zinc-700 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-zinc-50 transition">
            <Plus className="w-4 h-4" /> Create Tournament
          </button>
        </div>
      </section>

      {/* Live ticker */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <div className="overflow-hidden rounded-xl bg-zinc-900 text-white">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 text-[12px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#0E7C3A] animate-pulse" /> Live tournaments (demo)
          </div>
          <div className="flex gap-6 px-4 py-2 text-[12.5px] font-mono text-zinc-300 whitespace-nowrap">
            {TICKER.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* Game grid + filter */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] md:text-[26px] font-bold">গেমস</h2>
          <div className="flex gap-1.5">
            {([['all', 'All'], ['playable', 'Playable'], ['soon', 'Coming soon']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition ${
                  filter === k ? 'bg-[#0E7C3A] text-white' : 'bg-white border border-zinc-200 text-zinc-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shown.map((g) => {
            const playable = g.status === 'Playable'
            const card = (
              <div className="rounded-2xl bg-white border border-zinc-200 p-5 flex flex-col h-full">
                <div className="text-5xl mb-3">{g.icon}</div>
                <div className="text-[16px] font-bold">{g.name}</div>
                <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1 flex-1">{g.desc}</div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0E7C3A]/10 text-[#0E7C3A] font-medium">bKash entry</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">HTML5 · No download</span>
                </div>
                <div className="mt-4">
                  {playable ? (
                    <Link href={g.href!} className="block text-center py-2 rounded-xl bg-[#0E7C3A] text-white text-[13.5px] font-semibold hover:bg-[#0c6a32] transition">
                      Play now
                    </Link>
                  ) : (
                    <button className="w-full py-2 rounded-xl bg-zinc-100 text-zinc-500 text-[13.5px] font-medium flex items-center justify-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Notify me
                    </button>
                  )}
                </div>
              </div>
            )
            return <div key={g.name}>{card}</div>
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[22px] md:text-[26px] font-bold mb-5">কিভাবে কাজ করে</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 p-5">
              <div className="text-[20px] font-bold text-[#0E7C3A]">{s.n}</div>
              <div className="bangla text-[15px] font-semibold mt-1">{s.t}</div>
              <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[22px] md:text-[26px] font-bold mb-5">কেন Hostamar Gaming</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.t} className="rounded-2xl bg-white border border-zinc-200 p-5">
                <Icon className="w-6 h-6 text-[#0E7C3A] mb-3" />
                <div className="bangla text-[15px] font-semibold">{f.t}</div>
                <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{f.d}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[22px] md:text-[26px] font-bold mb-5">Weekly Leaderboard</h2>
        <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
          {LEADERBOARD.map((p, i) => (
            <div key={p.rank} className={`flex items-center gap-3 px-4 py-3 ${i < LEADERBOARD.length - 1 ? 'border-b border-zinc-100' : ''}`}>
              <span className={`w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold ${p.rank === 1 ? 'bg-[#0E7C3A] text-white' : 'bg-zinc-100 text-zinc-600'}`}>{p.rank}</span>
              <span className="font-mono text-[14px]">{p.name}</span>
              {p.rank === 1 && <Trophy className="w-4 h-4 text-[#0E7C3A] ml-auto" />}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing strip */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-bold">দাম</h3>
              <p className="bangla text-[14px] text-zinc-300 mt-1 leading-[1.6]">
                Free browse · bKash entry · টুর্নামেন্টে ফি স্পষ্ট থাকে।
                <br />
                একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট — Video + Hosting + Gaming।
              </p>
            </div>
            <Link href="/pricing" className="bangla px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center justify-center hover:bg-[#0c6a32] transition shrink-0">
              /pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* Fair play + 18+ */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-[15px] font-semibold">Fair Play • 18+</div>
            <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1">
              RNG fairness, anti-cheat, এবং self-limit — bKash compliance ও দায়িত্বশীল গেমিংয়ের জন্য। ১৮ বছরের নিচে খেলা নিষিদ্ধ।
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[22px] md:text-[26px] font-bold mb-5">প্রশ্ন ও উত্তর</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-2xl bg-white border border-zinc-200 p-4">
              <summary className="bangla text-[14.5px] font-semibold cursor-pointer">{f.q}</summary>
              <div className="bangla text-[13.5px] text-zinc-600 leading-[1.7] mt-2">{f.a}</div>
            </details>
          ))}
        </div>
        <p className="bangla text-[13px] text-zinc-500 mt-3">
          টাকা ফেরতের নিয়ম: <Link href="/refund" className="text-[#0E7C3A] font-medium underline">/refund</Link>
        </p>
      </section>
    </div>
  )
}
