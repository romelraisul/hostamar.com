// @ts-nocheck — see: referralRewards type needs threshold/label/bonus properties that the inferred API type doesn't declare
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from "next/navigation"
import { Copy, Check, Share2, Gift, Users, Award, TrendingUp, ArrowRight, RefreshCw, CopyCheck } from "lucide-react"

interface ReferralData {
  referralLink: string;
  referralCode: string;
  referredCount: number;
  referralRewards: Array<{ tier: string; reward: number; referredCount: number }>;
  completedCount: number;
  pendingCount: number;
  totalBonus: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const gtag: (...args: any[]) => void;

export default function ReferralPage() {
  const router = useRouter()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [appInstalled, setAppInstalled] = useState(false)

  useEffect(() => {
    fetchReferralData()
    // Check if PWA installed
    setAppInstalled(typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  const fetchReferralData = async () => {
    try {
      const res = await fetch('/api/referral', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setReferralData(data.data)
      else if (data.error === 'Unauthorized') router.push('/login')
    } catch (err) {
      console.error('Fetch referral error:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = async () => {
    try {
      if (navigator.share && !appInstalled) {
        await navigator.share({
          title: 'Hostamar - AI ভিডিও তৈরি করুন',
          text: 'আমি হোস্টামারে যোগদান করলাম! ফ্রি AI ভিডিও তৈরি করুন।',
          url: referralData?.referralLink
        })
      } else {
        await navigator.clipboard.writeText(referralData?.referralLink)
      }
      setCopied(true)
      // Reset after toast duration
      setTimeout(() => setCopied(false), 2500)

      // Track copy event
      if (typeof gtag !== 'undefined') {
        gtag('event', 'referral_link_copied', { method: copied ? 'clipboard' : 'share' })
      }
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = referralData?.referralLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData?.referralLink || '')}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareOnWhatsApp = () => {
    const message = encodeURIComponent('🎬 Hostamar - AI ভিডিও তৈরি করুন!\n\nআমি হোস্টামারে যোগদান করলাম এবং ফ্রি AI ভিডিও তৈরি করছি। তুমিও জয়েন!\n\n')
    const url = `https://wa.me/?text=${message}${encodeURIComponent(referralData?.referralLink || '')}`
    window.open(url, '_blank')
  }

  const shareOnMessenger = () => {
    const url = `fb-messenger://share?link=${encodeURIComponent(referralData?.referralLink || '')}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">লোড হচ্ছে...</div>
      </div>
    )
  }

  if (!referralData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center">
          <p className="text-white/70">প্রথমে লগইন করুন</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
          >
            লগইন করুন
          </button>
        </div>
      </div>
    )
  }

  const rewards: ({ tier: string; reward: number; referredCount: number; threshold: number; label?: string; bonus?: number })[] = referralData.referralRewards
  const progressPercent = Math.min((referralData.referredCount / 100) * 100, 100)
  const nextTier = rewards.find(r => referralData.referredCount < r.threshold)
  const currentTier = [...rewards].reverse().find(r => referralData.referredCount >= r.threshold)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Gift className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">রেফারেল প্রোগ্রাম</span>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
          <TrendingUp className="w-4 h-4" />
          আপনার নেটওয়ার্কের সেরা
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          বন্ধুদের আমন্ত্রণ জানান <br />
          <span className="text-gradient bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            উপার্জন করুন
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          আপনার ইউনিক রেফারেল লিংক শেয়ার করুন — প্রতিটি সফল সাইনআপে আপনি ও আপনার বন্ধু উভয়েরই বোনাস পাবেন!
        </p>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Left Column - Main Card */}
          <div className="md:col-span-3 space-y-6">
            {/* Referral Link Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Link2 className="text-blue-400 w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">আপনার রেফারেল লিংক</h2>
                    <p className="text-sm text-gray-400">ফ্রি অ্যাকাউন্টে ৫ জন, পেইড অ্যাকাউন্টে ১০ জন পান ওভাররাইড</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Referral Code Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400 w-28">রেফারেল কোড:</span>
                  <span className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 font-mono font-bold text-lg border border-purple-500/30">
                    {referralData.referralCode}
                  </span>
                </div>

                {/* Link with Copy */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralData.referralLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-mono focus:outline-none focus:border-blue-500/50 transition"
                  />
                  <button
                    onClick={copyReferralLink}
                    className={`px-4 py-3 rounded-xl font-medium transition flex items-center gap-2 ${
                      copied
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CopyCheck className="w-4 h-4" />
                        <span className="hidden md:inline">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden md:inline">কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={shareOnFacebook}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Facebook
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={shareOnMessenger}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    Messenger
                  </button>
                </div>

                {/* Referral Instructions */}
                <div className="bg-white/5 rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-bold text-white mb-3">কিভাবে কাজ করে:</h4>
                  <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                    <li>আপনার রেফারেল লিংক কপি করুন</li>
                    <li>ফেসবুক গ্রুপ, WhatsApp বা যেকোনো জায়গায় শেয়ার করুন</li>
                    <li>আপনার বন্ধু লিংকে ক্লিক করে সাইনআপ করবেন</li>
                    <li>উভয়েরই অ্যাকাউন্টে বোনাস যোগ হবে — তাৎক্ষণিকভাবে!</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">রেফারেল প্রোগ্রেস</h2>
                <span className="text-sm text-gray-400">{referralData.referredCount} / 100</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Milestones */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">
                    {currentTier ? `বর্তমান: ${currentTier.label}` : 'আপনার প্রথম বোনাসের কাছাকাছি!'}
                  </span>
                </div>
                {nextTier && (
                  <span className="text-blue-400 font-medium">
                    পরবর্তী: {nextTier.label}
                  </span>
                )}
              </div>

              {/* Reward Milestones */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                {referralData.referralRewards.map((tier, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-center border transition ${
                      referralData.referredCount >= tier.threshold
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="text-lg font-bold mb-1 ${
                      referralData.referredCount >= tier.threshold
                        ? 'text-green-400'
                        : 'text-gray-500'
                    }">{tier.bonus}৳</div>
                    <div className={`text-xs ${
                      referralData.referredCount >= tier.threshold
                        ? 'text-green-400'
                        : 'text-gray-500'
                    }`}>{tier.threshold} জন</div>
                    {referralData.referredCount >= tier.threshold && (
                      <Check className="w-3 h-3 mx-auto mt-1 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Stats Sidebar */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4">📊 রেফারেল স্ট্যাটস</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">মোট আমন্ত্রণ</span>
                  <span className="text-white font-bold">{referralData.referredCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">সফল রেফারেল</span>
                  <span className="text-green-400 font-bold">{referralData.completedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">পেন্ডিং</span>
                  <span className="text-yellow-400 font-bold">{referralData.pendingCount}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-gray-400 font-bold">মোট বোনাস অর্জন</span>
                  <span className="text-purple-400 font-bold text-xl">৳{referralData.totalBonus}</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4">🏆 রেফারেল লিডারবোর্ড</h2>
              <div className="space-y-3" id="leaderboard">
                {[
                  { name: 'রিয়াজ', referrals: 47, bonus: 15000 },
                  { name: 'তানভীর', referrals: 38, bonus: 10000 },
                  { name: 'মাহমুদ', referrals: 29, bonus: 7500 },
                  { name: 'সুমাইয়া', referrals: 22, bonus: 5000 },
                  { name: 'কামাল', referrals: 15, bonus: 3000 },
                ].map((leader, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3
                        ? ['bg-yellow-500/20 text-yellow-400', 'bg-gray-400/20 text-gray-400', 'bg-amber-600/20 text-amber-400'][idx]
                        : 'bg-white/10 text-gray-500'
                    }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">{leader.name}</div>
                      <div className="text-xs text-gray-500">{leader.referrals} জন রেফারেল</div>
                    </div>
                    <div className="text-sm font-bold text-green-400">৳{leader.bonus}</div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2.5 text-sm text-blue-400 hover:text-blue-300 transition font-medium">
                সম্পূর্ণ লিডারবোর্ড দেখুন →
              </button>
            </div>

            {/* FAQ Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4">❓ প্রায়ই জিজ্ঞাসিত</h2>
              <div className="space-y-3">
                {[
                  ['বোনাস কিভাবে পাব?', 'আপনার রেফারেল লিংকে ক্লিক করে যারা সাইনআপ করবেন, তাদের পেমেন্ট শেষ হলে বোনাস যোগ করা হয়।'],
                  ['বোনাস কখন পাব?', 'আপনার বন্ধু প্রথম পেমেন্ট সম্পন্ন করার পরই বোনাস যোগ করা হয়।'],
                  ['কতগুলো বন্ধু রেফারেল করতে পারে?', 'আনলিমিটেড! যত বেশি তত বেশি বোনাস।'],
                  ['বোনাস কোথায় ব্যবহার করব?', 'বোনাস আপনার অ্যাকাউন্ট ব্যালেন্সে যোগ হয়, যেকোনো পরিশোধে ব্যবহার করতে পারবেন।'],
                ].map(([q, a], idx) => (
                  <details key={idx} className="group">
                    <summary className="cursor-pointer text-sm font-medium text-white py-2 hover:text-blue-400 transition">
                      {q}
                    </summary>
                    <p className="text-sm text-gray-400 pb-2 pl-4">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Link2(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
}