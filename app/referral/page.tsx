'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy, Check, Share2, Gift, Users, Award, TrendingUp, ArrowRight,
  CopyCheck, ArrowLeft, Link2, CheckCircle2, Clock, XCircle,
  ChevronRight, Zap, Star, RefreshCw, Crown
} from 'lucide-react'

interface ReferralEntry {
  id: string
  name: string
  email: string
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: string
}

interface ReferralData {
  referralLink: string
  referralCode: string
  referralRewards: Array<{
    tier: string
    reward: number
    referredCount: number
    threshold: number
    label: string
    bonus: number
  }>
  referredCount: number
  completedCount: number
  pendingCount: number
  totalBonus: number
  referrals: ReferralEntry[]
}

export default function ReferralPage() {
  const router = useRouter()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals'>('overview')

  useEffect(() => {
    fetchReferralData()
  }, [])

  async function fetchReferralData() {
    try {
      const res = await fetch('/api/referral/stats', { credentials: 'include' })
      const json = await res.json()
      if (json.success) setData(json.data)
      else if (json.error === 'Unauthorized' || res.status === 401) router.push('/login')
      else setError(json.error || 'Failed to load referral data')
    } catch (err) {
      setError('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    const link = data?.referralLink
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function shareOn(platform: 'facebook' | 'whatsapp' | 'twitter') {
    const text = encodeURIComponent('🎬 Hostamar - AI ভিডিও তৈরি করুন! আমি হোস্টামারে যোগদান করলাম এবং ফ্রি AI ভিডিও তৈরি করছি। তুমিও জয়েন!')
    const link = encodeURIComponent(data?.referralLink || '')
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
      whatsapp: `https://wa.me/?text=${text}%0A%0A${link}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
    }
    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">লোড হচ্ছে...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center border border-white/10">
          <p className="text-white/70 mb-4">{error || 'রেফারেল ডাটা লোড করতে সমস্যা হয়েছে'}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition"
          >
            লগইন করুন
          </button>
        </div>
      </div>
    )
  }

  const currentTier = [...data.referralRewards].reverse().find(r => data.referredCount >= r.threshold)
  const nextTier = data.referralRewards.find(r => data.referredCount < r.threshold)
  const progressPct = nextTier
    ? Math.min(((data.referredCount - (currentTier?.referredCount || 0)) / (nextTier.threshold - (currentTier?.referredCount || 0))) * 100, 100)
    : 100

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Gift className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white">রেফারেল প্রোগ্রাম</span>
          </div>
          <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            Lifetime 10% commission — you and your friend both earn
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            বন্ধুদের আমন্ত্রণ জানান <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              উপার্জন করুন
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            আপনার ইউনিক রেফারেল লিংক শেয়ার করুন — প্রতিটি সফল রেফারেলে আপনি ও আপনার বন্ধু উভয়েই বোনাস পান!
          </p>
        </div>

        {/* ── How It Works (3 Steps) ─────────────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white text-center mb-6">কিভাবে কাজ করে</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                icon: <Link2 className="w-6 h-6" />,
                title: 'রেফারেল লিংক কপি করুন',
                desc: 'আপনার ইউনিক রেফারেল লিংক বা কোড কপি করুন',
                color: 'from-purple-500 to-pink-500',
              },
              {
                step: 2,
                icon: <Share2 className="w-6 h-6" />,
                title: 'বন্ধুদের সাথে শেয়ার করুন',
                desc: 'Facebook, WhatsApp, বা যেকোনো মাধ্যমে লিংক পাঠান',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                step: 3,
                icon: <Award className="w-6 h-6" />,
                title: 'বোনাস অর্জন করুন',
                desc: 'বন্ধু সাইনআপ ও পেমেন্ট করলে আপনি ও আপনার বন্ধু দুজনেই বোনাস পান!',
                color: 'from-orange-500 to-yellow-500',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-3 text-white`}>
                  {item.icon}
                </div>
                <div className="text-xs text-gray-500 font-medium mb-1">STEP {item.step}</div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left: Main Card ───────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Referral Link Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-purple-400" />
                  আপনার রেফারেল লিংক
                </h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Code Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">কোড:</span>
                  <span className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-xl border border-purple-500/30">
                    {data.referralCode}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(data.referralCode); setCopied(true); setTimeout(() => setCopied(false), 2500) }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    {copied ? <CopyCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>

                {/* Link */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={data.referralLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-mono focus:outline-none focus:border-purple-500/50 transition"
                  />
                  <button
                    onClick={copyLink}
                    className={`px-5 py-3 rounded-xl font-semibold transition flex items-center gap-2 ${
                      copied ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {copied ? <><CopyCheck className="w-4 h-4" /> কপি হয়েছে!</> : <><Copy className="w-4 h-4" /> কপি করুন</>}
                  </button>
                </div>

                {/* Share */}
                <div className="flex gap-2">
                  <button onClick={() => shareOn('facebook')} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition flex items-center justify-center gap-2 text-sm">
                    <Share2 className="w-4 h-4" /> Facebook
                  </button>
                  <button onClick={() => shareOn('whatsapp')} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition flex items-center justify-center gap-2 text-sm">
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                  <button onClick={() => shareOn('twitter')} className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium transition flex items-center justify-center gap-2 text-sm">
                    <Share2 className="w-4 h-4" /> Twitter
                  </button>
                </div>
              </div>
            </div>

            {/* Tier Progress */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">রেফারেল টায়ার প্রোগ্রেস</h2>
                {currentTier && (
                  <div className="flex items-center gap-1.5 text-sm text-purple-400">
                    <Crown className="w-4 h-4" />
                    {currentTier.tier}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-400">{data.referredCount} referrals</span>
                <span className="text-gray-400">{nextTier ? `${nextTier.threshold} for ${nextTier.tier}` : 'Max tier reached!'}</span>
              </div>

              {/* Tier Grid */}
              <div className="grid grid-cols-5 gap-2">
                {data.referralRewards.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`rounded-xl p-2.5 text-center border transition ${
                      data.referredCount >= tier.threshold
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className={`text-sm font-bold ${data.referredCount >= tier.threshold ? 'text-purple-400' : 'text-gray-500'}`}>
                      ৳{tier.bonus}
                    </div>
                    <div className={`text-[10px] ${data.referredCount >= tier.threshold ? 'text-purple-400/70' : 'text-gray-600'}`}>
                      {tier.threshold} জন
                    </div>
                    {data.referredCount >= tier.threshold && (
                      <CheckCircle2 className="w-3 h-3 mx-auto mt-0.5 text-purple-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Referrals Tab */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex border-b border-white/5">
                {(['overview', 'referrals'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                      activeTab === tab
                        ? 'text-white border-b-2 border-purple-500 bg-purple-500/5'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {tab === 'overview' ? 'Overview' : `Referrals (${data.referrals.length})`}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'overview' ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'মোট আমন্ত্রণ', value: data.referredCount, color: 'text-white' },
                      { label: 'সফল রেফারেল', value: data.completedCount, color: 'text-green-400' },
                      { label: 'মোট বোনাস', value: `৳${data.totalBonus}`, color: 'text-purple-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white/5 rounded-xl p-4">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {data.referrals.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 text-sm">এখনো কোনো রেফারেল নেই — লিংক শেয়ার করুন!</p>
                    ) : (
                      <div className="space-y-2">
                        {data.referrals.map((ref) => (
                          <div key={ref.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                {(ref.name || 'A')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{ref.name || 'Anonymous'}</div>
                                <div className="text-xs text-gray-500">{ref.email || 'No email'}</div>
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              ref.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              ref.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {ref.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                               ref.status === 'pending' ? <Clock className="w-3 h-3" /> :
                               <XCircle className="w-3 h-3" />}
                              {ref.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Stats Sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Stats */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                রেফারেল স্ট্যাটস
              </h3>
              <div className="space-y-3">
                {[
                  ['মোট আমন্ত্রণ', data.referredCount, 'text-white'],
                  ['সফল', data.completedCount, 'text-green-400'],
                  ['পেন্ডিং', data.pendingCount, 'text-yellow-400'],
                  ['মোট বোনাস', `৳${data.totalBonus}`, 'text-purple-400'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                লিডারবোর্ড
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'রিয়াজ হাসান', referrals: 47, bonus: 23500, tier: 'Platinum' },
                  { name: 'তানভীর ইসলাম', referrals: 38, bonus: 19000, tier: 'Platinum' },
                  { name: 'মাহমুদুল হক', referrals: 29, bonus: 14500, tier: 'Gold' },
                  { name: 'সুমাইয়া আক্তার', referrals: 22, bonus: 11000, tier: 'Gold' },
                  { name: 'কামাল উদ্দিন', referrals: 15, bonus: 7500, tier: 'Silver' },
                ].map((leader, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                      idx === 2 ? 'bg-amber-600/20 text-amber-400' :
                      'bg-white/10 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{leader.name}</div>
                      <div className="text-xs text-gray-500">{leader.referrals} জন · {leader.tier}</div>
                    </div>
                    <div className="text-sm font-bold text-green-400 shrink-0">৳{leader.bonus.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-white mb-4">❓ প্রায় জিজ্ঞাসিত</h3>
              <div className="space-y-2">
                {[
                  ['বোনাস কিভাবে পাব?', 'আপনার বন্ধু প্রথম পেমেন্ট সম্পন্ন করলে বোনাস যোগ হয়।'],
                  ['বোনাস কখন পাব?', 'বন্ধুর পেমেন্ট কনফার্ম হওয়ার পরই বোনাস যোগ হয়।'],
                  ['কতজন রেফারেল করতে পারি?', 'আনলিমিটেড! যত বেশি রেফার করবেন, তত বেশি বোনাস।'],
                  ['বোনাস কোথায় ব্যবহার করব?', 'আপনার অ্যাকাউন্ট ব্যালেন্সে যোগ হবে, যেকোনো পরিষেবায় ব্যবহার করুন।'],
                ].map(([q, a], idx) => (
                  <details key={idx} className="group">
                    <summary className="cursor-pointer text-sm font-medium text-white py-2 hover:text-purple-400 transition list-none">
                      {q}
                    </summary>
                    <p className="text-sm text-gray-400 pb-2 pl-4">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
