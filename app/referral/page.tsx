'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from "next/navigation"
import { Copy, Check, Share2, Gift, Users, Award, TrendingUp, ArrowRight, RefreshCw, CopyCheck } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

const GREEN = '#0E7C3A'

interface ReferralData {
  referralLink: string;
  referralCode: string;
  referredCount: number;
  referralRewards: Array<{ tier: string; reward: number; referredCount: number; threshold?: number; label?: string; bonus?: number }>;
  completedCount: number;
  pendingCount: number;
  totalBonus: number;
}

declare const gtag: (...args: unknown[]) => void;

export default function ReferralPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [appInstalled, setAppInstalled] = useState(false)

  useEffect(() => {
    fetchReferralData()
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
          title: 'Hostamar - AI Video Creation',
          text: 'I joined Hostamar! Create free AI videos.',
          url: referralData?.referralLink
        })
      } else {
        await navigator.clipboard.writeText(referralData?.referralLink ?? '')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)

      if (typeof gtag !== 'undefined') {
        gtag('event', 'referral_link_copied', { method: copied ? 'clipboard' : 'share' })
      }
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = referralData?.referralLink ?? ''
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
    const message = encodeURIComponent('🎬 Hostamar - AI Video Creation!\n\nI joined Hostamar and I am creating AI videos. Join too!\n\n')
    const url = `https://wa.me/?text=${message}${encodeURIComponent(referralData?.referralLink || '')}`
    window.open(url, '_blank')
  }

  const shareOnMessenger = () => {
    const url = `fb-messenger://share?link=${encodeURIComponent(referralData?.referralLink || '')}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFCF9] flex items-center justify-center">
        <div className="bangla animate-pulse text-zinc-500">{t('referral.loading')}</div>
      </div>
    )
  }

  if (!referralData) {
    return (
      <div className="min-h-screen bg-[#FCFCF9] flex items-center justify-center p-4">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-8 max-w-md w-full text-center shadow-sm">
          <p className="bangla text-zinc-600">{t('referral.loginFirst')}</p>
          <button
            onClick={() => router.push('/login')}
            className="bangla mt-4 px-8 py-3 bg-[#0E7C3A] hover:bg-[#0c6a32] text-white rounded-full font-medium transition"
          >
            {t('referral.login')}
          </button>
        </div>
      </div>
    )
  }

  const rewards = referralData.referralRewards
  const progressPercent = Math.min((referralData.referredCount / 100) * 100, 100)
  const nextTier = rewards.find(r => referralData.referredCount < (r.threshold || 0))
  const currentTier = [...rewards].reverse().find(r => referralData.referredCount >= (r.threshold || 0))

  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      {/* Header */}

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E7C3A]/10 border border-[#0E7C3A]/20 text-[#0E7C3A] text-sm font-medium mb-6">
          <TrendingUp className="w-4 h-4" />
          {t('referral.bestNetwork')}
        </div>
        <h1 className="bangla text-4xl md:text-5xl font-bold text-zinc-900 mb-4 leading-tight tracking-[-0.03em]">
          {t('referral.heroTitle')} <br />
          <span style={{ color: GREEN }}>
            {t('referral.heroEarn')}
          </span>
        </h1>
        <p className="bangla text-zinc-500 text-lg max-w-2xl mx-auto">
          {t('referral.heroDesc')}
        </p>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Left Column - Main Card */}
          <div className="md:col-span-3 space-y-6">
            {/* Referral Link Card */}
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0E7C3A]/10 flex items-center justify-center">
                    <svg className="text-[#0E7C3A] w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </div>
                  <div>
                    <h2 className="bangla text-lg font-bold text-zinc-900">{t('referral.yourLink')}</h2>
                    <p className="bangla text-sm text-zinc-500">{t('referral.linkDesc')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Referral Code Badge */}
                <div className="flex items-center gap-3">
                  <span className="bangla text-sm font-medium text-zinc-500 w-28">{t('referral.code')}</span>
                  <span className="px-3 py-1.5 rounded-lg bg-[#0E7C3A]/10 text-[#0E7C3A] font-mono font-bold text-lg border border-[#0E7C3A]/20">
                    {referralData.referralCode}
                  </span>
                </div>

                {/* Link with Copy */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralData.referralLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl bg-[#FCFCF9] border border-zinc-200 text-zinc-700 text-sm font-mono focus:outline-none focus:border-[#0E7C3A] transition"
                  />
                  <button
                    onClick={copyReferralLink}
                    className={`px-4 py-3 rounded-xl font-medium transition flex items-center gap-2 ${
                      copied
                        ? 'bg-[#0E7C3A] hover:bg-[#0c6a32] text-white'
                        : 'bg-[#0E7C3A] hover:bg-[#0c6a32] text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CopyCheck className="w-4 h-4" />
                        <span className="hidden md:inline bangla">{t('referral.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="hidden md:inline bangla">{t('referral.copy')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={shareOnFacebook}
                    className="flex-1 py-3 rounded-xl bg-[#0E7C3A] hover:bg-[#0c6a32] text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Facebook
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className="flex-1 py-3 rounded-xl bg-[#0E7C3A] hover:bg-[#0c6a32] text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={shareOnMessenger}
                    className="flex-1 py-3 rounded-xl bg-[#0E7C3A] hover:bg-[#0c6a32] text-white font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    Messenger
                  </button>
                </div>

                {/* Referral Instructions */}
                <div className="bg-[#FCFCF9] rounded-xl p-4 mt-4 border border-zinc-200">
                  <h4 className="bangla text-sm font-bold text-zinc-900 mb-3">{t('referral.howItWorks')}</h4>
                  <ol className="bangla text-sm text-zinc-600 space-y-2 list-decimal list-inside">
                    <li>{t('referral.step1')}</li>
                    <li>{t('referral.step2')}</li>
                    <li>{t('referral.step3')}</li>
                    <li>{t('referral.step4')}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="bangla text-lg font-bold text-zinc-900">{t('referral.progress')}</h2>
                <span className="bangla text-sm text-zinc-500">{referralData.referredCount} / 100</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-[#0E7C3A]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Milestones */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#0E7C3A]" />
                  <span className="bangla text-zinc-600">
                    {currentTier ? `${t('referral.currentTier')} ${currentTier.label || currentTier.tier}` : t('referral.firstBonus')}
                  </span>
                </div>
                {nextTier && (
                  <span className="text-[#0E7C3A] font-medium">
                    {t('referral.nextTier')} {nextTier.label || nextTier.tier}
                  </span>
                )}
              </div>

              {/* Reward Milestones */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                {referralData.referralRewards.map((tier, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-center border transition ${
                      referralData.referredCount >= (tier.threshold || 0)
                        ? 'bg-[#0E7C3A]/10 border-[#0E7C3A]/30'
                        : 'bg-[#FCFCF9] border-zinc-200'
                    }`}
                  >
                    <div className={`text-lg font-bold mb-1 ${
                      referralData.referredCount >= (tier.threshold || 0)
                        ? 'text-[#0E7C3A]'
                        : 'text-zinc-500'
                    }`}>{tier.bonus || tier.reward}৳</div>
                    <div className={`text-xs ${
                      referralData.referredCount >= (tier.threshold || 0)
                        ? 'text-[#0E7C3A]'
                        : 'text-zinc-500'
                    }`}>{tier.threshold || tier.referredCount} referrals</div>
                    {referralData.referredCount >= (tier.threshold || 0) && (
                      <Check className="w-3 h-3 mx-auto mt-1 text-[#0E7C3A]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Stats Sidebar */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats Card */}
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm p-6">
              <h2 className="bangla text-lg font-bold text-zinc-900 mb-4">{t('referral.stats')}</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="bangla text-zinc-500">{t('referral.totalInvites')}</span>
                  <span className="text-zinc-900 font-bold">{referralData.referredCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="bangla text-zinc-500">{t('referral.successful')}</span>
                  <span className="text-[#0E7C3A] font-bold">{referralData.completedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="bangla text-zinc-500">{t('referral.pending')}</span>
                  <span className="text-[#E4312B] font-bold">{referralData.pendingCount}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                  <span className="bangla text-zinc-900 font-bold">{t('referral.totalEarned')}</span>
                  <span className="text-[#0E7C3A] font-bold text-xl">৳{referralData.totalBonus}</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Card */}
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm p-6">
              <h2 className="bangla text-lg font-bold text-zinc-900 mb-4">{t('referral.leaderboard')}</h2>
              <div className="space-y-3" id="leaderboard">
                {[
                  { name: 'Riaz', referrals: 47, bonus: 15000 },
                  { name: 'Tanvir', referrals: 38, bonus: 10000 },
                  { name: 'Mahmud', referrals: 29, bonus: 7500 },
                  { name: 'Sumaiya', referrals: 22, bonus: 5000 },
                  { name: 'Kamal', referrals: 15, bonus: 3000 },
                ].map((leader, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3
                        ? ['bg-[#0E7C3A]/10 text-[#0E7C3A]', 'bg-zinc-200 text-zinc-600', 'bg-[#E4312B]/10 text-[#E4312B]'][idx]
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-zinc-900 font-medium">{leader.name}</div>
                      <div className="text-xs text-zinc-500">{leader.referrals} referrals</div>
                    </div>
                    <div className="text-sm font-bold text-[#0E7C3A]">৳{leader.bonus}</div>
                  </div>
                ))}
              </div>
              <button className="bangla mt-4 w-full py-2.5 text-sm text-[#0E7C3A] hover:text-[#0c6a32] transition font-medium">
                {t('referral.viewFull')}
              </button>
            </div>

            {/* FAQ Card */}
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm p-6">
              <h2 className="bangla text-lg font-bold text-zinc-900 mb-4">{t('referral.faq')}</h2>
              <div className="space-y-3">
                {[
                  [t('referral.faqQ1'), t('referral.faqA1')],
                  [t('referral.faqQ2'), t('referral.faqA2')],
                  [t('referral.faqQ3'), t('referral.faqA3')],
                  [t('referral.faqQ4'), t('referral.faqA4')],
                ].map(([q, a], idx) => (
                  <details key={idx} className="group">
                    <summary className="bangla cursor-pointer text-sm font-medium text-zinc-900 py-2 hover:text-[#0E7C3A] transition">
                      {q}
                    </summary>
                    <p className="bangla text-sm text-zinc-500 pb-2 pl-4">{a}</p>
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
