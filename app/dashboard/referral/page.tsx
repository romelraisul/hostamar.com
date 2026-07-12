'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Copy, Share2, Gift, Trophy, CheckCircle } from 'lucide-react'

export default function ReferralPage() {
  const { data: session } = useSession()
  const [referralCode, setReferralCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/referral', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const d = json?.data
        if (!d) return
        setReferralCode(d.referralCode || '')
        setReferralCount(d.completedCount || 0)
        // 1 credit per completed referral, capped at bonus earned
        setCredits(d.completedCount || 0)
      } catch {
        /* keep defaults */
      }
    }
    load()
  }, [session])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`https://hostamar.com/signup?ref=${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">রিফারেল প্রোগ্রাম</h1>
        <p className="text-gray-600">বন্ধুদের আপনার রিফারেল লিঙ্ক শেয়ার করুন, ১ ক্রেডিট পেয়ে নিন!</p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-8 h-8" />
          <h2 className="text-xl font-semibold">আপনার রিফারেল লিঙ্ক</h2>
        </div>
        
        <div className="bg-white/20 rounded-lg p-4 flex items-center justify-between">
          <code className="text-lg font-mono">
            https://hostamar.com/signup?ref={referralCode}
          </code>
          <button
            onClick={copyToClipboard}
            className="ml-4 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition flex items-center gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'কপি হয়েছে!' : 'কপি করুন'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span className="text-gray-600">মোট রিফারেল</span>
          </div>
          <p className="text-3xl font-bold">{referralCount}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-6 h-6 text-green-600" />
            <span className="text-gray-600">ক্রেডিট</span>
          </div>
          <p className="text-3xl font-bold">{credits}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <span className="text-gray-600">লিডারবোর্ডে</span>
          </div>
          <p className="text-3xl font-bold"># --</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl p-6 border mb-6">
        <h3 className="text-lg font-semibold mb-4">কিভাবে কাজ করে?</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>আপনার রিফারেল লিঙ্ক শেয়ার করুন (Facebook, Twitter, WhatsApp)</li>
          <li>বন্ধু আপনার লিঙ্ক ব্যবহার করে Signup করলে রিফারেল রেকর্ড হয়</li>
          <li>প্রতি সফল রিফারেল = <strong>১ ফ্রি ক্রেডিট</strong></li>
          <li>ক্রেডিট দিয়ে AI ভিডিও বা VPS ব্যবহার করুন</li>
        </ol>
      </div>

      {/* Social Share Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" /> Facebook শেয়ার
        </button>
        <button className="flex-1 bg-sky-500 text-white py-3 rounded-lg font-medium hover:bg-sky-600 transition flex items-center justify-center gap-2">
          Twitter শেয়ার
        </button>
        <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2">
          WhatsApp শেয়ার
        </button>
      </div>
    </div>
  )
}