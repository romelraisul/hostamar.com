'use client'

// Bazaar Poster contact page (Direction C, 2026-09). ALL logic preserved:
// /api/contact submission (durable lead capture + owner notify) with status
// states, clipboard copy of the support
// email, file-name capture, agreement gate, real phone/WhatsApp/office data.
// Only presentation restyled.

import BazaarNav from '@/components/home/BazaarNav'
import BazaarFooter from '@/components/home/BazaarFooter'
import { useState } from 'react'
import Link from 'next/link'
import {
  Mail, Phone, MapPin, MessageSquare, Copy, Check,
  MessageCircle, ShieldCheck, Clock, Star, Zap, Globe,
  Upload, Send,
} from 'lucide-react'

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hostamar.com'
const PHONE = '+8809696517463'
const PHONE_DISPLAY = '+880 9696 517463'
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
  { href: '/video', icon: Zap, title: 'ভিডিওতে বাংলা ভাঙছে?', body: 'ফন্ট সেটিংস ঠিক করে ৪K রেন্ডার করুন, গাইড দেখুন।' },
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
      const res = await fetch('/api/contact', {
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || 'পাঠানো যায়নি, আবার চেষ্টা করুন')
      }
      setStatus('success')
      setName(''); setEmail(''); setPhone(''); setMessage(''); setFileName(''); setAgreed(false)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'পাঠানো যায়নি, আবার চেষ্টা করুন')
    }
  }

  return (
    <div className="bp-theme">
      <BazaarNav />
      <div className="bp-page-hero" style={{ textAlign: 'center' }}>
        <div className="bp-wrap" style={{ maxWidth: 760, marginInline: 'auto' }}>
          <span className="bp-stamp" style={{ marginBottom: '.8rem' }}>
            <span className="bp-live-dot" aria-hidden="true" />লাইভ চ্যাট ২৪/৭, রিয়েল হিউম্যান
          </span>
          <h1 style={{ maxWidth: 'none', marginInline: 'auto' }}>
            আমরা শুনছি, <span style={{ color: 'var(--bp-green)' }}>বাংলায় উত্তর দিচ্ছি</span>
          </h1>
          <p style={{ marginInline: 'auto' }}>
            bKash টাকা গেল কিন্তু একাউন্ট একটিভ হলো না? ভিডিওতে বাংলা ভাঙছে? সরাসরি আমাদের বাংলাদেশ টিমকে লিখুন।
            <b> ১২ মিনিটে উত্তর পাবেন।</b>
          </p>
        </div>
      </div>

      <section className="bp-sec">
        <div className="bp-wrap bp-contact-grid">
          {/* LEFT — contact channels */}
          <div className="bp-tile">
            <h2 className="bp-h2" style={{ fontSize: '1.25rem' }}>সরাসরি যোগাযোগ</h2>
            <p className="bp-muted" style={{ fontSize: '.88rem', marginBottom: '1.1rem' }}>আপনার সুবিধামতো যেকোনো মাধ্যম বেছে নিন</p>

            <div style={{ display: 'grid', gap: '.8rem' }}>
              {/* Email + copy */}
              <div className="bp-info-row">
                <span className="bp-info-ic"><Mail size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="bp-muted" style={{ fontSize: '.78rem' }}>ইমেইল</p>
                  <p style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{SUPPORT_EMAIL}</p>
                </div>
                <button onClick={copyEmail} className="bp-btn bp-btn-ghost" style={{ padding: '.45rem .9rem', fontSize: '.85rem' }}>
                  {copied ? <Check size={14} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} /> : <Copy size={14} strokeWidth={1.7} aria-hidden="true" />}
                  {copied ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>

              {/* Phone + call */}
              <div className="bp-info-row">
                <span className="bp-info-ic"><Phone size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="bp-muted" style={{ fontSize: '.78rem' }}>ফোন</p>
                  <p style={{ fontWeight: 700 }}>{PHONE_DISPLAY}</p>
                </div>
                <a href={`tel:${PHONE}`} className="bp-btn bp-btn-ghost" style={{ padding: '.45rem .9rem', fontSize: '.85rem' }}>কল করুন</a>
              </div>

              {/* WhatsApp */}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="bp-wa">
                <span className="bp-wa-ic"><MessageCircle size={19} strokeWidth={1.7} aria-hidden="true" /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '.78rem', opacity: .85 }}>WhatsApp</p>
                  <p style={{ fontWeight: 700 }}>+880 1822 417463</p>
                </div>
                <span className="bp-wa-cta">চ্যাট করুন</span>
              </a>

              {/* Location + live chat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
                <div className="bp-mini-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--bp-green)' }}>
                    <MapPin size={15} strokeWidth={1.7} aria-hidden="true" />
                    <span style={{ fontSize: '.78rem', fontWeight: 600 }}>অফিস</span>
                  </div>
                  <p style={{ fontSize: '.85rem', marginTop: '.45rem', lineHeight: 1.5 }}>ঢাকা + বগুড়া<br />শনি-বৃহঃ সকাল ১০টা - সন্ধ্যা ৭টা</p>
                </div>
                <div className="bp-mini-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--bp-green)' }}>
                    <MessageSquare size={15} strokeWidth={1.7} aria-hidden="true" />
                    <span style={{ fontSize: '.78rem', fontWeight: 600 }}>লাইভ চ্যাট</span>
                  </div>
                  <p style={{ fontSize: '.85rem', marginTop: '.45rem', lineHeight: 1.5 }}>২৪/৭ চালু<br />রিয়েল হিউম্যান</p>
                </div>
              </div>

              {/* Verified merchant */}
              <div className="bp-mini-card" style={{ background: 'var(--bp-paper-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--bp-green)' }}>
                  <ShieldCheck size={15} strokeWidth={1.7} aria-hidden="true" />
                  <span style={{ fontSize: '.78rem', fontWeight: 600 }}>Verified Merchant</span>
                </div>
                <div className="bp-stamp-row" style={{ marginTop: '.6rem', gap: '.5rem' }}>
                  {['bKash', 'Nagad', 'Rocket'].map((m) => (
                    <span key={m} className="bp-stamp" style={{ padding: '.3rem .8rem', fontSize: '.85rem' }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="bp-tile">
            <h2 className="bp-h2" style={{ fontSize: '1.25rem' }}>মেসেজ পাঠান</h2>
            <p className="bp-muted" style={{ fontSize: '.88rem', marginBottom: '1.1rem' }}>টপিক বাছাই করলে সঠিক টিমকে ১২ মিনিটে পেয়ে যাবেন</p>

            {status === 'success' ? (
              <div className="bp-form-ok">
                <div className="bp-form-ok-ic"><Check size={22} strokeWidth={2} aria-hidden="true" /></div>
                <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>মেসেজ পৌঁছে গেছে!</p>
                <p className="bp-muted" style={{ fontSize: '.88rem', marginTop: '.2rem' }}>Avg reply 12 min, No bot, real human</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                <div className="bp-form-field">
                  <label htmlFor="cf-topic">বিষয়</label>
                  <select
                    id="cf-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="bp-form-field">
                    <label htmlFor="cf-name">নাম</label>
                    <input id="cf-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
                  </div>
                  <div className="bp-form-field">
                    <label htmlFor="cf-email">ইমেইল</label>
                    <input id="cf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
                  </div>
                </div>

                <div className="bp-form-field">
                  <label htmlFor="cf-phone">ফোন <span className="bp-muted">(ঐচ্ছিক)</span></label>
                  <input id="cf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880 1XXX XXXXXX" />
                </div>

                <div className="bp-form-field">
                  <label htmlFor="cf-msg">মেসেজ</label>
                  <textarea id="cf-msg" rows={4} required value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="সমস্যাটি লিখুন, যেমন: bKash ট্রাঞ্জেকশন করেছি কিন্তু একাউন্ট একটিভ হচ্ছে না" />
                </div>

                <div className="bp-form-field">
                  <label htmlFor="cf-file">স্ক্রিনশট <span className="bp-muted">(ঐচ্ছিক)</span></label>
                  <label className="bp-upload" htmlFor="cf-file">
                    <Upload size={15} strokeWidth={1.7} aria-hidden="true" />
                    {fileName ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span> : 'স্ক্রিনশট আপলোড করুন (ভিডিওতে বাংলা ভাঙলে সাহায্য করে)'}
                    <input id="cf-file" type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
                  </label>
                </div>

                <label className="bp-agree">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>আমি টার্মস &amp; কন্ডিশন মেনে নিচ্ছি।</span>
                </label>

                {status === 'error' && (
                  <div className="bp-form-err">{errorMsg}</div>
                )}

                <button type="submit" disabled={status === 'sending'} className="bp-btn bp-btn-primary" style={{ width: '100%' }}>
                  <Send size={15} strokeWidth={1.7} aria-hidden="true" />
                  {status === 'sending' ? 'পাঠানো হচ্ছে…' : 'মেসেজ পাঠান'}
                </button>
                <p className="bp-muted" style={{ textAlign: 'center', fontSize: '.78rem' }}>Avg reply 12 min, No bot, real human</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Quick help */}
      <section className="bp-sec" style={{ paddingTop: 0 }}>
        <div className="bp-wrap bp-quick-grid">
          {QUICK_HELP.map((c) => {
            const Ic = c.icon
            return (
              <Link key={c.href} href={c.href} className="bp-tile" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                  <span className="bp-info-ic" style={{ width: 38, height: 38 }}><Ic size={18} strokeWidth={1.7} aria-hidden="true" /></span>
                  <h3 style={{ fontSize: '1rem', marginBottom: 0 }}>{c.title}</h3>
                </div>
                <p style={{ marginTop: '.7rem', fontSize: '.9rem' }}>{c.body}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Office + proof */}
      <section className="bp-sec" style={{ paddingTop: 0 }}>
        <div className="bp-wrap bp-office-grid">
          <div className="bp-tile" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--bp-green)' }}>
              <MapPin size={15} strokeWidth={1.7} aria-hidden="true" />
              <span style={{ fontSize: '.9rem', fontWeight: 600 }}>আমাদের অফিস</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem', marginTop: '.8rem' }}>
              <div className="bp-mini-card">
                <p style={{ fontWeight: 700, fontSize: '.92rem' }}>ঢাকা</p>
                <p className="bp-muted" style={{ fontSize: '.82rem', marginTop: '.2rem' }}>মিরপুর, ঢাকা - ১২১৬</p>
              </div>
              <div className="bp-mini-card">
                <p style={{ fontWeight: 700, fontSize: '.92rem' }}>বগুড়া</p>
                <p className="bp-muted" style={{ fontSize: '.82rem', marginTop: '.2rem' }}>সাতমাথা, বগুড়া - ৫৮০০</p>
              </div>
            </div>
            <div className="bp-hours">
              <Clock size={15} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-amber)' }} />
              <span>শনি-বৃহঃ সকাল ১০টা - সন্ধ্যা ৭টা, শুক্রবার বন্ধ</span>
            </div>
          </div>

          <div className="bp-tile" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <span className="bp-stamp" style={{ padding: '.3rem .8rem', fontSize: '.9rem' }}>
                <Star size={14} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-amber)', fill: 'var(--bp-amber)' }} />

              </span>
              <span className="bp-muted" style={{ fontSize: '.88rem' }}>বাংলাদেশে তৈরি, bKash/Nagad সাপোর্ট</span>
            </div>
            <p className="bp-muted" style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
              বাংলাদেশের SME, ক্রিয়েটর ও এজেন্সিদের জন্য Hostamar, ভিডিও, হোস্টিং, চ্যাট সব এক জায়গায়।
            </p>
            <div className="bp-stamp-row" style={{ gap: '.4rem' }}>
              {['Video', 'Hosting', 'Chat', 'Browser', 'IDE', 'Gaming'].map((p) => (
                <span key={p} className="bp-stamp" style={{ padding: '.22rem .7rem', fontSize: '.8rem' }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    <BazaarFooter />
    </div>
  )
}
