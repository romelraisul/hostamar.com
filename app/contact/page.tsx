'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail, Phone, MapPin, MessageSquare, Copy, Check,
  MessageCircle, ShieldCheck, Clock, Star, Zap, Globe, Gamepad2,
  Upload, Send,
} from 'lucide-react'

const GREEN = '#0E7C3A'
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hostamar.com'
const PHONE = '+8809696517463'
const PHONE_DISPLAY = '+880 9696 517463'
const WHATSAPP = '+8801822417463'
const WHATSAPP_URL = 'https://wa.me/8801822417463'

const TOPICS = [
  { value: 'billing', label: 'bKash বিলিং / পেমেন্ট' },
  { value: 'video', label: 'ভিডিও রেন্ডারিং' },
  { value: 'hosting', label: 'Hosting সমস্যা' },
  { value: 'gaming', label: 'Gaming পেআউট' },
  { value: 'other', label: 'অন্যান্য' },
] as const

const QUICK_HELP = [
  { href: '/pricing', icon: ShieldCheck, title: 'bKash পেমেন্ট হয়নি?', body: 'ট্রাঞ্জেকশন আইডি দিয়ে ৩০ সেকেন্ডে অ্যাকাউন্ট অ্যাকটিভ করুন।' },
  { href: '/video', icon: Zap, title: 'ভিডিওতে বাংলা ভাঙছে?', body: 'ফন্ট সেটিংস ঠিক করে ৪K রেন্ডার করুন — গাইড দেখুন।' },
  { href: '/browser', icon: Globe, title: 'ব্রাউজার স্লো?', body: 'ক্যাশে ক্লিয়ার ও এক্সটেনশন চেক করুন।' },
]

export default function ContactPage() {
  const [copied, setCopied] = useState(false)
  const [topic, setTopic] = useState<string>('billing')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [fileName, setFileName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard not available */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) {
      setStatus('error')
      setErrorMsg('Terms-এ টিক দিন।')
      return
    }
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          name,
          email,
          phone: phone || undefined,
          message,
          attachment: fileName || undefined,
        }),
      })
      if (!res.ok) throw new Error('পাঠানো যায়নি')
      setStatus('success')
      setName(''); setEmail(''); setPhone(''); setMessage(''); setFileName(''); setAgreed(false)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'পাঠানো যায়নি, আবার চেষ্টা করুন')
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      {/* Hero */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pt-12 md:pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium text-zinc-600 mb-5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E7C3A] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E7C3A]" />
          </span>
          লাইভ চ্যাট ২৪/৭ — রিয়েল হিউম্যান
        </div>
        <h1 className="text-[32px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.08]">
          আমরা শুনছি, <span style={{ color: GREEN }}>বাংলায় উত্তর দিচ্ছি</span>
        </h1>
        <p className="bangla mt-4 text-[15px] md:text-[17px] text-zinc-500 max-w-[620px] mx-auto">
          bKash টাকা গেল কিন্তু একাউন্ট একটিভ হলো না? ভিডিওতে বাংলা ভাঙছে? সরাসরি আমাদের বাংলাদেশ টিমকে লিখুন।
          <span className="font-semibold text-zinc-800"> ১২ মিনিটে উত্তর পাবেন।</span>
        </p>
      </section>

      {/* Main grid: contact options + form */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT — real contact options */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-6 md:p-8">
            <h2 className="bangla text-[20px] font-semibold mb-1">সরাসরি যোগাযোগ</h2>
            <p className="bangla text-[13px] text-zinc-500 mb-6">আপনার সুবিধামতো যেকোনো মাধ্যম বেছে নিন</p>

            <div className="space-y-4">
              {/* Email + copy */}
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0E7C3A]/10">
                  <Mail className="h-5 w-5 text-[#0E7C3A]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="bangla text-[12px] text-zinc-500">ইমেইল</p>
                  <p className="font-semibold truncate">{SUPPORT_EMAIL}</p>
                </div>
                <button onClick={copyEmail} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-[13px] font-medium hover:bg-zinc-50 transition">
                  {copied ? <Check className="h-3.5 w-3.5 text-[#0E7C3A]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>

              {/* Phone + call */}
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0E7C3A]/10">
                  <Phone className="h-5 w-5 text-[#0E7C3A]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="bangla text-[12px] text-zinc-500">ফোন</p>
                  <p className="font-semibold">{PHONE_DISPLAY}</p>
                </div>
                <a href={`tel:${PHONE}`} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-[13px] font-medium hover:bg-zinc-50 transition">
                  কল করুন
                </a>
              </div>

              {/* WhatsApp */}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-4 text-white transition hover:brightness-95">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white/80">WhatsApp</p>
                  <p className="font-semibold">+880 1822 417463</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-2 text-[13px] font-medium">
                  চ্যাট করুন
                </span>
              </a>

              {/* Location + live chat */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2 text-[#0E7C3A]">
                    <MapPin className="h-4 w-4" />
                    <span className="bangla text-[12px] font-medium">অফিস</span>
                  </div>
                  <p className="bangla mt-2 text-[13px] text-zinc-700 leading-5">ঢাকা + বগুড়া<br/>স্যাট-বৃহঃ ১০টা–৭টা</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2 text-[#0E7C3A]">
                    <MessageSquare className="h-4 w-4" />
                    <span className="bangla text-[12px] font-medium">লাইভ চ্যাট</span>
                  </div>
                  <p className="bangla mt-2 text-[13px] text-zinc-700 leading-5">২৪/৭ চালু<br/>রিয়েল হিউম্যান</p>
                </div>
              </div>

              {/* Verified merchant badges */}
              <div className="rounded-2xl border border-zinc-200 bg-[#FCFCF9] p-4">
                <div className="flex items-center gap-2 text-[#0E7C3A] mb-3">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="bangla text-[12px] font-medium">Verified Merchant</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['bKash', 'Nagad', 'Rocket'].map((m) => (
                    <span key={m} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-6 md:p-8">
            <h2 className="bangla text-[20px] font-semibold mb-1">মেসেজ পাঠান</h2>
            <p className="bangla text-[13px] text-zinc-500 mb-6">টপিক বাছাই করলে সঠিক টিমকে ১২ মিনিটে পেয়ে যাবেন</p>

            {status === 'success' ? (
              <div className="rounded-2xl border border-[#0E7C3A]/30 bg-[#0E7C3A]/5 p-6 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#0E7C3A] text-white">
                  <Check className="h-6 w-6" />
                </div>
                <p className="bangla text-[15px] font-semibold text-zinc-800">মেসেজ পৌঁছে গেছে!</p>
                <p className="bangla mt-1 text-[13px] text-zinc-500">Avg reply 12 min • No bot, real human</p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">বিষয়</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] focus:border-[#0E7C3A] focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"
                >
                  {TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">নাম</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] focus:border-[#0E7C3A] focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"
                    placeholder="আপনার নাম" />
                </div>
                <div>
                  <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">ইমেইল</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] focus:border-[#0E7C3A] focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"
                    placeholder="name@email.com" />
                </div>
              </div>

              <div>
                <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">ফোন <span className="text-zinc-400">(ঐচ্ছিক)</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] focus:border-[#0E7C3A] focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"
                  placeholder="+880 1XXX XXXXXX" />
              </div>

              <div>
                <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">মেসেজ</label>
                <textarea rows={4} required value={message} onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[14px] focus:border-[#0E7C3A] focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20"
                  placeholder="সমস্যাটি লিখুন — যেমন: bKash ট্রাঞ্জেকশন করেছি কিন্তু একাউন্ট একটিভ হচ্ছে না" />
              </div>

              <div>
                <label className="bangla block text-[13px] font-medium text-zinc-700 mb-1.5">স্ক্রিনশট <span className="text-zinc-400">(ঐচ্ছিক)</span></label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-[#FCFCF9] px-4 py-3 text-[13px] text-zinc-600 hover:border-[#0E7C3A]">
                  <Upload className="h-4 w-4" />
                  {fileName ? <span className="bangla truncate text-zinc-800">{fileName}</span> : 'স্ক্রিনশট আপলোড করুন (ভিডিওতে বাংলা ভাঙলে সাহায্য করে)'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
                </label>
              </div>

              <label className="flex items-start gap-2.5 text-[13px] text-zinc-600">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#0E7C3A] focus:ring-[#0E7C3A]" />
                <span className="bangla">আমি টার্মস & কন্ডিশন মেনে নিচ্ছি।</span>
              </label>

              {status === 'error' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{errorMsg}</div>
              )}

              <button type="submit" disabled={status === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0E7C3A] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0c6a31] disabled:opacity-60">
                <Send className="h-4 w-4" />
                {status === 'sending' ? 'পাঠানো হচ্ছে…' : 'মেসেজ পাঠান'}
              </button>
              <p className="bangla text-center text-[11px] text-zinc-500">Avg reply 12 min • No bot, real human</p>
            </form>
            )}

          </div>
        </div>
      </section>

      {/* Quick help cards — deflect ~40% tickets */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_HELP.map((c) => {
            const Ic = c.icon
            return (
              <Link key={c.href} href={c.href}
                    className="group rounded-[20px] border border-zinc-200 bg-white p-5 transition hover:border-[#0E7C3A]/40 hover:shadow-[0_12px_32px_-16px_rgba(14,124,58,0.25)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E7C3A]/10 text-[#0E7C3A]">
                    <Ic className="h-5 w-5" />
                  </div>
                  <h3 className="bangla text-[15px] font-semibold">{c.title}</h3>
                </div>
                <p className="bangla mt-3 text-[13px] leading-5 text-zinc-500">{c.body}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Local trust: office + hours + social proof */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Office map placeholder */}
          <div className="md:col-span-2 rounded-[24px] border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2 text-[#0E7C3A] mb-1">
              <MapPin className="h-4 w-4" />
              <span className="bangla text-[14px] font-medium">আমাদের অফিস</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-[#FCFCF9] p-4">
                <p className="bangla text-[13px] font-semibold text-zinc-800">ঢাকা</p>
                <p className="bangla mt-1 text-[12px] text-zinc-500">মিরপুর, ঢাকা — ১২১৬</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-[#FCFCF9] p-4">
                <p className="bangla text-[13px] font-semibold text-zinc-800">বগুড়া</p>
                <p className="bangla mt-1 text-[12px] text-zinc-500">সাতমাথা, বগুড়া — ৫৮০০</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-zinc-900 p-4 text-white">
              <Clock className="h-4 w-4 text-[#0E7C3A]" />
              <span className="bangla text-[13px]">Sat–Thu ১০am–৭pm • Friday বন্ধ</span>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex flex-col justify-center gap-4 rounded-[24px] border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-[#0E7C3A]/10 px-3 py-1.5">
                <Star className="h-4 w-4 fill-[#0E7C3A] text-[#0E7C3A]" />
                <span className="text-[14px] font-bold text-[#0E7C3A]">4.8</span>
              </div>
              <span className="bangla text-[13px] text-zinc-600">৫০০+ ক্রিয়েটর বিশ্বাস করে</span>
            </div>
            <p className="bangla text-[13px] leading-5 text-zinc-500">
              বাংলাদেশের ৫০০+ ক্রিয়েটর ও এজেন্সি HostAmar ব্যবহার করছে — ভিডিও, হোস্টিং, চ্যাট সব এক জায়গায়।
            </p>
            <div className="flex flex-wrap gap-2">
              {['Video', 'Hosting', 'Chat', 'Browser', 'IDE', 'Gaming'].map((p) => (
                <span key={p} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
