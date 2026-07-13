'use client'
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FAQS, FEATURED_FAQS } from '@/lib/faqs';

const GREEN = "#0E7C3A";
const RED = "#E4312B";

// Homepage structured data — Product + real Offers (mirrors app/pricing) + FAQPage.
// No AggregateRating: we surface the 4.8★ badge as a UI trust mark only, not as
// unbacked schema.org review data.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';
const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar',
  description: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং — এক সাবস্ক্রিপশনে।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '2000', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Business', price: '3500', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Enterprise', price: '6000', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
  ],
  aggregateOffer: { '@type': 'AggregateOffer', lowPrice: '2000', highPrice: '6000', priceCurrency: 'BDT' },
  mainEntity: FAQS.slice(0, 6).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const PRODUCTS = [
  { href: '/generate', label: 'AI ভিডিও', desc: 'পণ্যের ছবি → ভিডিও', emoji: '🎬' },
  { href: '/hosting', label: 'হোস্টিং', desc: 'bKash, ঢাকা CDN', emoji: '🌐' },
  { href: '/chat', label: 'AI চ্যাট', desc: 'বাংলা AI, ভয়েস', emoji: '💬' },
  { href: '/browser', label: 'ব্রাউজার', desc: 'ক্লাউড ব্রাউজার', emoji: '🧭' },
  { href: '/ide', label: 'IDE', desc: 'অনলাইন কোড এডিটর', emoji: '⌨️' },
  { href: '/gaming', label: 'গেমিং', desc: 'ক্লাউড গেম হোস্ট', emoji: '🎮' },
];

export default function App() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(()=>setToast(null), 2600);
  };

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased selection:bg-[#0E7C3A]/20 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 h-11 rounded-full bg-zinc-900 text-white text-[13px] font-medium flex items-center shadow-xl animate-[in_.2s_ease]">
          {toast}
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', 'Hind Siliguri', system-ui, sans-serif; }
        .bangla { font-family: 'Hind Siliguri', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      

      <main className="mx-auto max-w-[1120px] px-5 lg:px-0 overflow-hidden">
        {/* HERO */}
        <section className="pt-10 md:pt-20 pb-10 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium shadow-sm mb-5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{background: GREEN}}></span>
              <span className="bangla">বাংলাদেশি SME দের জন্য তৈরি</span>
              <span className="text-zinc-300">|</span>
              <span className="text-zinc-500">Made for Bangladesh</span>
            </div>

            <h1 className="bangla text-[36px] md:text-[56px] leading-[1.05] font-bold tracking-[-0.03em]">
              বাংলাদেশি ব্যবসার জন্য<br/>
              <span className="relative inline-block">
                <span className="relative z-10">AI ভিডিও,</span>
                <span className="absolute bottom-[8px] left-0 right-0 h-[12px] bg-[#0E7C3A]/15 -rotate-[1deg]"></span>
              </span>
              <span style={{color: GREEN}}> ৩০ সেকেন্ডে</span> রেডি
            </h1>

            <p className="bangla mt-5 text-[16px] md:text-[18px] leading-[1.6] text-zinc-600 max-w-[520px]">
              পণ্যের ছবি দিন, AI বাকিটা সামলাবে — বাংলা ভয়েসওভার, সাবটাইটেল, ব্র্যান্ড লোগো সহ প্রফেশনাল মার্কেটিং ভিডিও। কোনো এডিটিং স্কিল লাগবে না।
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/generate" className="h-[48px] px-6 rounded-full text-white font-semibold bangla text-[15px] inline-flex items-center gap-2 shadow-[0_12px_24px_-10px_rgba(14,124,58,0.6)] hover:translate-y-[-1px] transition" style={{background: GREEN}}>
                <span>▶</span> ফ্রি ভিডিও বানান
              </Link>
              <button onClick={()=>{document.getElementById('templates')?.scrollIntoView({behavior:'smooth'})}} className="h-[48px] px-6 rounded-full bg-white border border-zinc-200 font-medium text-[14px] inline-flex items-center gap-2 hover:bg-zinc-50 transition">
                টেমপ্লেট দেখুন <span>→</span>
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4 text-[12px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><span className="text-[14px]">✓</span> ক্রেডিট কার্ড লাগবে না</span>
              <span className="h-3 w-px bg-zinc-200"></span>
              <span className="inline-flex items-center gap-1.5"><span className="text-[14px]">✓</span> bKash এ পেমেন্ট</span>
            </div>
          </div>

          {/* Video Preview Mock */}
          <div className="relative overflow-hidden md:overflow-visible">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0E7C3A]/10 via-transparent to-[#E4312B]/10 blur-2xl rounded-[40px]"></div>
            
            <div className="rounded-[28px] bg-white border border-zinc-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15),0_1px_0_0_rgba(0,0,0,0.03)] p-2.5">
              {/* browser chrome */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#FF5F56]"></div>
                  <div className="h-3 w-3 rounded-full bg-[#FFBD2E]"></div>
                  <div className="h-3 w-3 rounded-full bg-[#27C93F]"></div>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">hostamar.com/editor • Auto-saved</div>
                <div className="h-6 w-16 rounded-full bg-zinc-100"></div>
              </div>

              <div className="relative rounded-[20px] overflow-hidden bg-[#0A0A0A] aspect-[16/10] flex items-center justify-center">
                {/* fake video content */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"></div>
                <div className="absolute inset-0 opacity-40" style={{backgroundImage: `radial-gradient(circle at 30% 20%, ${GREEN} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${RED} 0%, transparent 40%)`}}></div>
                
                <div className="relative z-10 text-center p-6 w-full">
                  <div className="mx-auto w-fit rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-[11px] text-white mb-6">ঈদ কালেকশন • 9:16 • 30s</div>
                  
                  <div className="flex justify-center">
                    <button onClick={()=>showToast("ডেমো ভিডিও প্লে হচ্ছে ▶ 1080p")} className="h-[72px] w-[72px] rounded-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center justify-center text-[28px] hover:scale-105 transition">▶</button>
                  </div>

                  <div className="mt-8 mx-auto max-w-[320px] rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-3 flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-[18px]">👗</div>
                    <div className="flex-1">
                      <div className="h-2.5 w-24 bg-white/80 rounded"></div>
                      <div className="mt-1.5 h-2 w-32 bg-white/30 rounded"></div>
                    </div>
                    <div className="h-7 px-2.5 rounded-full bg-white text-zinc-900 text-[11px] font-semibold flex items-center" style={{}}>Buy Now</div>
                  </div>
                </div>

                {/* bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[56px] bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 pb-3 gap-2">
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-[68%] rounded-full" style={{background: GREEN}}></div>
                  </div>
                  <div className="text-[11px] text-white/70 font-mono">00:21 / 00:30</div>
                </div>
              </div>

              {/* chips */}
              <div className="flex flex-wrap gap-2 px-2 pt-3 pb-1">
                {[
                  {label:"ঈদ অফার", emoji:"🌙", active:true},
                  {label:"পহেলা বৈশাখ", emoji:"🌸", active:false},
                  {label:"11.11 Sale", emoji:"🛍️", active:false},
                  {label:"শীত কালেকশন", emoji:"🧥", active:false},
                ].map(chip=>(
                  <button key={chip.label} className={`h-8 px-3.5 rounded-full text-[13px] font-medium bangla inline-flex items-center gap-1.5 border transition ${chip.active ? "text-white border-transparent shadow-sm" : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-white"}`} style={chip.active?{background:GREEN}:{}}>
                    <span>{chip.emoji}</span> {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* floating badge */}
            <div className="absolute right-2 md:-right-4 -bottom-4 md:bottom-6 rounded-2xl bg-white border border-zinc-200 shadow-xl px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#0E7C3A]/10 flex items-center justify-center text-[18px]">⚡</div>
              <div>
                <div className="text-[13px] font-semibold bangla leading-none">রেন্ডার সম্পন্ন</div>
                <div className="text-[11px] text-zinc-500 mt-1">২৩ সেকেন্ডে • 1080p</div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="rounded-[20px] bg-white border border-zinc-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-0 overflow-hidden">
          <div className="flex-1 flex items-center justify-between md:justify-start gap-6 px-6 md:px-8 py-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold tracking-tight">500+</span>
              <span className="text-[13px] text-zinc-500 bangla font-medium">অ্যাকটিভ ক্রিয়েটর</span>
            </div>
            <div className="hidden md:block h-8 w-px bg-zinc-100"></div>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold tracking-tight">10k+</span>
              <span className="text-[13px] text-zinc-500 bangla font-medium">ভিডিও তৈরি</span>
            </div>
            <div className="hidden md:block h-8 w-px bg-zinc-100"></div>
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-bold tracking-tight">4.8</span>
              <span className="text-yellow-500">★★★★★</span>
              <span className="text-[12px] text-zinc-500">(212)</span>
            </div>
          </div>
          <div className="bg-zinc-50 border-t md:border-t-0 md:border-l border-zinc-200 px-6 md:px-8 py-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3].map(i=>(
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center text-[12px]">🙂</div>
              ))}
            </div>
            <div className="text-[12px] leading-[1.3]">
              <div className="font-medium bangla">বিশ্বস্ত ব্র্যান্ডগুলো ব্যবহার করছে</div>
              <div className="text-zinc-500">Aarong, Sailor, Daraz sellers</div>
            </div>
          </div>
        </section>

        {/* Bento Features */}
        <section id="features" className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="bangla text-[28px] md:text-[32px] font-bold leading-[1.15] tracking-[-0.02em]">বাংলাদেশের জন্য<br/>বিশেষভাবে তৈরি ফিচার</h2>
            <div className="flex flex-col items-start gap-3">
              <p className="bangla text-[14px] text-zinc-500 max-w-[320px] leading-[1.6]">Silicon Valley টুল নয় — bKash, বাংলা ভয়েস, লোকাল ফন্ট, সবকিছুই আপনার দোকানের জন্য।</p>
              <Link href="/features" className="bangla text-[13px] font-semibold text-[#0E7C3A] inline-flex items-center gap-1 hover:gap-2 transition-all">সব ৩০+ ফিচার দেখুন →</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[220px]">
            {/* বাংলা ভয়েস */}
            <div className="md:col-span-7 rounded-[24px] bg-white border border-zinc-200 p-6 md:p-7 flex flex-col justify-between overflow-hidden relative shadow-sm">
              <div className="absolute right-0 top-0 w-[55%] h-full opacity-[0.08]" style={{background:`radial-gradient(circle at 80% 20%, ${GREEN}, transparent 70%)`}}></div>
              <div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[20px] border" style={{background:`${GREEN}12`, borderColor:`${GREEN}20`}}>🎙️</div>
                <h3 className="bangla mt-4 text-[20px] font-semibold">ন্যাচারাল বাংলা ভয়েস</h3>
                <p className="bangla mt-1.5 text-[14px] text-zinc-500 leading-[1.6] max-w-[340px]">রোবটিক নয় — ঢাকাইয়া, চট্টগ্রামের টান সহ ৬টি বাংলা ভয়েস। আপনার স্ক্রিপ্ট পড়বে একদম মানুষের মতো।</p>
              </div>
              <div className="mt-6 rounded-xl bg-zinc-50 border border-zinc-200 p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center">▶</div>
                <div className="flex-1">
                  <div className="flex gap-[2px] items-end h-[18px]">
                    {Array.from({length:22}).map((_,i)=><div key={i} className="w-[3px] rounded-full bg-zinc-300" style={{height:`${4+Math.sin(i*1.3)*6+Math.random()*8}px`, background: i>8 && i<16 ? GREEN : undefined}}></div>)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 bangla">“এবারের ঈদ কালেকশনে ৫০% ছাড়!” • Female - Nafisa</div>
                </div>
                <div className="text-[11px] px-2 py-1 rounded-full bg-white border">0:08</div>
              </div>
            </div>

            {/* bKash */}
            <div className="md:col-span-5 rounded-[24px] p-6 md:p-7 flex flex-col justify-between text-white relative overflow-hidden shadow-[0_12px_30px_-12px_rgba(14,124,58,0.6)]" style={{background: `linear-gradient(135deg, ${GREEN} 0%, #0A5A2B 100%)`}}>
              <div className="absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full bg-white/10 blur-2xl"></div>
              <div>
                <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-[20px]">💳</div>
                <h3 className="bangla mt-4 text-[20px] font-semibold">bKash / Nagad / Rocket</h3>
                <p className="bangla mt-1.5 text-[14px] text-white/70 leading-[1.6]">ইন্টারন্যাশনাল কার্ড লাগবে না। লোকাল পেমেন্টে ইনস্ট্যান্ট একটিভেশন।</p>
              </div>
              <div className="mt-6 flex gap-2">
                {["bKash","Nagad","Rocket","Upay"].map(p=>(
                  <div key={p} className="h-8 px-3 rounded-full bg-white text-zinc-900 text-[12px] font-semibold flex items-center">{p}</div>
                ))}
              </div>
            </div>

            {/* Brand Kit */}
            <div className="md:col-span-5 rounded-[24px] bg-[#FFF7ED] border border-[#FED7AA] p-6 md:p-7 flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="h-10 w-10 rounded-xl bg-white border border-orange-200 flex items-center justify-center text-[18px]">🎨</div>
                <h3 className="bangla mt-4 text-[19px] font-semibold">আপনার ব্র্যান্ড, সব ভিডিওতে</h3>
                <p className="bangla mt-1.5 text-[13px] text-zinc-600 leading-[1.6]">লোগো, কালার, ফন্ট একবার সেট করুন — প্রতিটি ভিডিওতে অটো অ্যাপ্লাই হবে।</p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white border border-orange-100 p-2.5">
                  <div className="h-6 w-6 rounded-full" style={{background:GREEN}}></div>
                  <div className="mt-2 h-1.5 w-10 bg-zinc-200 rounded"></div>
                </div>
                <div className="rounded-xl bg-white border border-orange-100 p-2.5">
                  <div className="h-6 w-10 rounded-md bg-zinc-900"></div>
                  <div className="mt-2 h-1.5 w-8 bg-zinc-200 rounded"></div>
                </div>
                <div className="rounded-xl bg-white border border-orange-100 p-2.5 flex items-center justify-center text-[16px] font-bold">আড়ং</div>
              </div>
            </div>

            {/* Auto subtitle */}
            <div className="md:col-span-7 rounded-[24px] bg-zinc-900 text-white p-6 md:p-7 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{background:`radial-gradient(400px at 100% 0%, ${RED}40, transparent)`}}></div>
              <div className="relative z-10 max-w-[300px]">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-[18px]">💬</div>
                <h3 className="bangla mt-4 text-[19px] font-semibold">অটো সাবটাইটেল + হুক জেনারেটর</h3>
                <p className="bangla mt-1.5 text-[13px] text-white/60 leading-[1.6]">AI ক্যাপশন, ভাইরাল হুক, CTA — ফেসবুক রিলস ও টিকটকের জন্য অপটিমাইজড।</p>
              </div>
              <div className="relative z-10 w-full md:w-[260px] rounded-[16px] bg-white text-zinc-900 p-3 shadow-xl">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Generated Hooks</div>
                <div className="mt-2 space-y-2">
                  {["এই ঈদে সবাই তাকিয়ে থাকবে আপনার দিকে 👀","১০০০+ মেয়ে ইতিমধ্যে নিয়েছে, আপনি বাকি কেন?","দাম শুনলে বিশ্বাস করবেন না..."].map((t,i)=>(
                    <div key={i} className={`rounded-xl px-3 py-2.5 text-[13px] bangla leading-[1.4] border ${i===0 ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}>{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mt-20">
          <div className="flex items-center justify-between">
            <h2 className="bangla text-[24px] md:text-[28px] font-bold">৫০+ রেডিমেড টেমপ্লেট</h2>
            <button onClick={()=>showToast("সব টেমপ্লেট লোড হচ্ছে...")} className="text-[13px] font-medium px-3.5 h-8 rounded-full border bg-white inline-flex items-center gap-1 hover:bg-zinc-50">সব দেখুন →</button>
          </div>

          <div className="mt-6 -mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 w-max pr-5 md:pr-0">
              {[
                {title:"ঈদ মুবারক সেল", cat:"Fashion", color:"#FFF1F2", emoji:"🌙"},
                {title:"পহেলা বৈশাখ", cat:"Festival", color:"#F0FDF4", emoji:"🌸"},
                {title:"11.11 মেগা সেল", cat:"E-com", color:"#FFFBEB", emoji:"⚡"},
                {title:"শীতের জ্যাকেট", cat:"Winter", color:"#EFF6FF", emoji:"🧥"},
                {title:"বিউটি গ্লো", cat:"Beauty", color:"#FDF2F8", emoji:"✨"},
                {title:"ফুড ডেলিভারি", cat:"Food", color:"#FEFCE8", emoji:"🍱"},
              ].map(card=>(
                <div key={card.title} className="w-[220px] shrink-0 rounded-[20px] border bg-white overflow-hidden shadow-sm hover:shadow-md transition">
                  <div className="h-[132px] relative flex items-center justify-center text-[40px]" style={{background: card.color}}>
                    <span>{card.emoji}</span>
                    <div className="absolute top-3 left-3 text-[11px] font-medium px-2 py-1 rounded-full bg-white border shadow-sm">{card.cat}</div>
                    <div className="absolute bottom-3 right-3 h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[12px]">▶</div>
                  </div>
                  <div className="p-3.5">
                    <div className="bangla font-semibold text-[14px] leading-tight">{card.title}</div>
                    <div className="mt-1 text-[12px] text-zinc-500">9:16 • 24s • বাংলা ভয়েস</div>
                    <div className="mt-3 flex gap-1.5">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full w-[70%] rounded-full" style={{background:GREEN}}></div></div>
                      <span className="text-[10px] text-zinc-400">Popular</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-20">
          <div className="text-center max-w-[620px] mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium bangla mb-4"><span className="h-2 w-2 rounded-full" style={{background:GREEN}}></span>একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট</span>
            <h2 className="bangla text-[30px] md:text-[38px] font-bold leading-[1.1] tracking-[-0.02em]">ভিডিও কিনুন, হোস্টিং-চ্যাট ফ্রি পান</h2>
            <p className="bangla mt-3 text-[14px] text-zinc-500">প্রতিটি প্ল্যানে AI ভিডিও + হোস্টিং + Chat + Browser + IDE একসাথে। আলাদা করে কিছু কিনতে হবে না। bKash, Nagad, Rocket সাপোর্টেড।</p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4 md:gap-5 items-start">
            {/* Free */}
            <div className="rounded-[24px] bg-white border border-zinc-200 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Free</h3>
                <span className="text-[11px] px-2 py-1 rounded-full bg-zinc-100 border">ট্রাই করুন</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-[36px] font-bold tracking-tight">৳0</span><span className="text-zinc-500 text-[13px]">/মাস</span></div>
              <ul className="mt-6 space-y-2.5 text-[13px] text-zinc-600">
                {["৫টি ভিডিও / মাস","১GB হোস্টিং ফ্রি","Chat বেসিক","৭২০p এক্সপোর্ট","১টি ব্র্যান্ড কিট"].map(f=><li key={f} className="flex gap-2"><span className="text-zinc-400">—</span><span className="bangla">{f}</span></li>)}
              </ul>
              <Link href="/signup" className="mt-7 h-11 w-full rounded-full border bg-white font-medium text-[14px] flex items-center justify-center hover:bg-zinc-50 bangla">ফ্রি শুরু করুন</Link>
            </div>

            {/* Starter Popular */}
            <div className="rounded-[24px] border-2 p-[1px] shadow-[0_18px_40px_-16px_rgba(14,124,58,0.45)]" style={{background:`linear-gradient(135deg, ${GREEN}, #16A34A)`}}>
              <div className="rounded-[22px] bg-white p-6 md:p-7 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#0E7C3A]/30 to-transparent"></div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">Starter <span className="h-5 px-2 rounded-full text-white text-[10px] font-bold flex items-center" style={{background:GREEN}}>POPULAR</span></h3>
                  <span className="text-[11px] font-medium text-zinc-500">SME দের পছন্দ</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-[36px] font-bold tracking-tight">৳2,000</span><span className="text-zinc-500 text-[13px]">/মাস</span>
                  <span className="ml-2 text-[12px] line-through text-zinc-400">৳2,800</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-[13px]">
                  {["১০টি ভিডিও / মাস","৫GB হোস্টিং ফ্রি","Chat Pro + ভয়েস","Browser + IDE অ্যাক্সেস","1080p, No watermark","bKash অটো-রিনিউ"].map(f=>(
                    <li key={f} className="flex gap-2"><span className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] text-white shrink-0" style={{background:GREEN}}>✓</span><span className="bangla">{f}</span></li>
                  ))}
                </ul>
                <Link href="/signup?plan=starter" className="mt-7 h-11 w-full rounded-full text-white font-semibold text-[14px] flex items-center justify-center shadow-[0_10px_20px_-10px_rgba(14,124,58,0.7)] hover:brightness-105 transition bangla" style={{background:GREEN}}>Starter নিন →</Link>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500"><span>পেমেন্ট:</span><span className="font-semibold">bKash</span><span>•</span><span className="font-semibold">Nagad</span><span>•</span><span className="font-semibold">Rocket</span></div>
              </div>
            </div>

            {/* Business */}
            <div className="rounded-[24px] bg-zinc-900 text-white p-6 md:p-7 border border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Business</h3>
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10">এজেন্সি</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-[36px] font-bold tracking-tight">৳3,500</span><span className="text-white/50 text-[13px]">/মাস</span></div>
              <ul className="mt-6 space-y-2.5 text-[13px] text-white/70">
                {["৩০টি ভিডিও / মাস","২০GB হোস্টিং ফ্রি","সব প্রোডাক্ট আনলিমিটেড","Game টুর্নামেন্ট হোস্টিং","4K এক্সপোর্ট + API","টিম ৫ জন + প্রায়োরিটি সাপোর্ট"].map(f=><li key={f} className="flex gap-2"><span className="text-white/30">—</span><span className="bangla">{f}</span></li>)}
              </ul>
              <Link href="/signup?plan=business" className="mt-7 h-11 w-full rounded-full bg-white text-zinc-900 font-semibold text-[14px] flex items-center justify-center hover:bg-zinc-100 bangla">Business নিন →</Link>
            </div>
          </div>

          <div className="mt-6 rounded-full bg-white border border-zinc-200 px-4 py-2.5 w-fit mx-auto flex items-center gap-2 text-[12px] text-zinc-600">
            <span className="h-5 w-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">🔒</span>
            <span className="bangla">SSL সুরক্ষিত পেমেন্ট • ৭ দিনের মানি-ব্যাক গ্যারান্টি • ভ্যাট সহ</span>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 grid md:grid-cols-[320px_1fr] gap-8 scroll-mt-24">
          <div>
            <h2 className="bangla text-[26px] font-bold leading-tight">সাধারণ প্রশ্ন</h2>
            <p className="bangla mt-2 text-[13px] text-zinc-500 leading-[1.6]">SME ওনারদের সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্ন। আরও জানতে সাপোর্টে নক দিন।</p>
            <Link href="/faq" className="bangla mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0E7C3A] hover:gap-2 transition-all">সব ২৫টি প্রশ্ন দেখুন →</Link>
            <div className="mt-5 hidden md:flex items-center gap-2 text-[13px]">
              <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center">💬</div>
              <div><div className="font-medium bangla">লাইভ চ্যাট সাপোর্ট</div><div className="text-[12px] text-zinc-500">সকাল ৯টা - রাত ১০টা</div></div>
            </div>
          </div>

          <div className="rounded-[20px] bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
            {FEATURED_FAQS(6).map((item, idx)=>(
              <button key={item.id} onClick={()=>setFaqOpen(faqOpen===idx?null:idx)} className="w-full text-left px-6 py-5 flex items-start justify-between gap-6 hover:bg-zinc-50/60 transition">
                <div className="flex-1">
                  <div className="bangla font-medium text-[15px] leading-[1.4]">{item.q}</div>
                  {faqOpen===idx && <div className="bangla mt-2.5 text-[13.5px] leading-[1.7] text-zinc-600">{item.a}</div>}
                </div>
                <div className={`h-8 w-8 shrink-0 rounded-full border flex items-center justify-center text-[14px] transition ${faqOpen===idx ? "bg-zinc-900 text-white border-zinc-900 rotate-45" : "bg-white text-zinc-500"}`}>+</div>
              </button>
            ))}
          </div>
        </section>

        {/* Footer */}
        
      </main>
    </div>
  );
}
