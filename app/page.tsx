import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';
import { FAQS } from '@/lib/faqs';
import tools from '@/lib/services-catalog-tools.json';
import BazaarNav from '@/components/home/BazaarNav';
import LazyVideo from '@/components/lazy-video';
import BazaarFooter from '@/components/home/BazaarFooter';

// Bazaar Poster homepage (Direction C, approved 2026-09-14).
// Server component: FAQ uses native <details>, so no client state needed.
// revalidate: content is baked at build; deploys refresh it (see below).
// ponytail: 86400 not 3600 — runtime ISR re-renders die on the Workers CPU
// ceiling (set() never lands), so 3600 just made every request stale-serve
// with s-maxage=2 an hour after each deploy (TTFB 1.4-1.9s all afternoon).
// Content is baked at build; deploys replace it anyway.
export const revalidate = 86400;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';

// Real counts — never hardcode marketing numbers again.
const TOOL_COUNT = (tools as unknown[]).length;
const toBn = (n: number) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
// ponytail: fs readdir at build/revalidate; literal is the last-verified fallback.
function tvVideoCount(): number {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'public/tv')).filter((f) => f.endsWith('.mp4')).length;
  } catch {
    return 168; // verified 2026-10-08
  }
}
async function modelCount(): Promise<number> {
  try {
    const r = await fetch('https://ai.hostamar.com/v1/models', { next: { revalidate: 86400 } }); // ponytail: must be >= page revalidate or Next clamps the route to 3600 and edge caching decays hourly
    const j = await r.json();
    return Array.isArray(j?.data) ? j.data.length : 152;
  } catch {
    return 152; // verified 2026-10-08
  }
}

export const metadata = {
  title: 'Hostamar - Sovereign GPU AI Video with bKash in Bangladesh',
  description: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং, এক সাবস্ক্রিপশনে',
  alternates: { canonical: 'https://hostamar.com/' },
}

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar',
  description: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং, এক সাবস্ক্রিপশনে',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/signup' },
    { '@type': 'Offer', name: 'Starter', price: '599', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Business', price: '1999', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Premium', price: '4999', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Bangla LLM Training', price: '5000', priceCurrency: 'BDT', url: 'https://hostamar.com/bangla-llm' },
  ],
  aggregateOffer: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '5000', priceCurrency: 'BDT' },
  mainEntity: FAQS.slice(0, 6).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default async function HomePage() {
  const featured = FAQS.slice(0, 5);
  const videos = tvVideoCount();
  const models = await modelCount();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <BazaarNav />

      <main className="bp-theme">
        {/* HERO — Bangla copy verbatim from screenshots */}
        <section className="relative overflow-hidden bg-[#FCFCF9]">
          <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
            {/* Left: copy */}
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-xs font-semibold text-[#0E7C3A]">
                বাংলাদেশি ব্যবসার জন্য
              </span>
              <h1 className="font-hind text-4xl font-bold leading-tight tracking-tight text-[#18181B] lg:text-5xl">
                বগুড়ার দোকান থেকে দুবাইয়ের বায়ার - সবার জন্য ৩০ সেকেন্ডে ভিডিও
              </h1>
              <p className="mt-4 text-lg text-zinc-600">
                আপনি শুধু মুখে বলবেন কী চান। আমরা আপনার ভাষায়, আপনার মুখে, আপনার দোকানের জন্য ভিডিও বানিয়ে দেব। বাংলা সহ ৬৪৬টা ভাষায়। আপনার ভিডিও বাংলাদেশ আর ইউরোপের কম্পিউটারে বানানো হয়, কোথাও পাচার হয় না।
              </p>
              <p className="mt-2 text-base text-zinc-500">
                ১২০০ জনের বেশি মানুষ ইতিমধ্যে বানিয়েছে। আজ শুধু ৫টা জায়গা খালি আছে।
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#0E7C3A] px-7 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.6)] transition hover:bg-[#0A5A2B]"
                >
                  আমার ভিডিও বানান - ৩০ সেকেন্ডে শুরু করুন
                </Link>
                <Link
                  href="/prompts"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 text-base font-semibold text-[#18181B] transition hover:bg-zinc-100"
                >
                  টেমপ্লেট দেখুন
                </Link>
              </div>

              {/* trust badges — real payment names, no broken icons */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-zinc-500">
                <span className="text-[#0E7C3A]">bKash</span>
                <span className="text-[#E4312B]">Nagad</span>
                <span className="text-[#7B2FF7]">Rocket</span>
                <span className="text-zinc-400">·</span>
                <span>৳0 থেকে শুরু</span>
              </div>
            </div>

            {/* Right: studio UI mock showing Select → Customize → Export */}
            <div className="relative">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
                <div className="mb-3 flex items-center gap-1.5 px-1">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
                  <Link
                    href="/generate"
                    className="ml-2 text-xs text-zinc-400 transition hover:text-[#0E7C3A]"
                  >
                    hostamar.com/generate
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['টেমপ্লেট', 'কাস্টমাইজ', 'এক্সপোর্ট'].map((step, i) => (
                    <div key={step} className="rounded-xl border border-zinc-200 bg-[#FCFCF9] p-3 text-center">
                      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#0E7C3A]/10 text-sm font-bold text-[#0E7C3A]">
                        {i + 1}
                      </div>
                      <div className="text-xs font-semibold text-[#18181B]">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-[#0E7C3A]/10 to-[#E4312B]/10">
                  <span className="text-sm font-medium text-zinc-500">
                    ভিডিও প্রিভিউ
                  </span>
                </div>
              </div>
              <div className="absolute -right-3 -top-3 rounded-full bg-[#E4312B] px-3 py-1 text-xs font-bold text-white shadow-lg">
                30s ⚡
              </div>
            </div>
          </div>
        </section>

        {/* PROOF STAMPS */}
        <section className="bp-sec" style={{ paddingBlock: '0.6rem 2rem' }} aria-label="আস্থার প্রমাণ">
          <div className="bp-wrap bp-stamp-row bp-rise bp-d3" style={{ justifyContent: 'center' }}>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
              {toBn(videos)}টি লাইভ রেন্ডার — /tv
            </span>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l-5 6 5 6M16 6l5 6-5 6" /></svg>
              {toBn(TOOL_COUNT)} AI টুলস, এক API
            </span>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" /></svg>
              {toBn(models)} মডেল গেটওয়ে
            </span>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
              bKash 01822417463
            </span>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 8.5A2.5 2.5 0 0 0 7.1 21h9.8a2.5 2.5 0 0 0 2.1-3.5L14 9V3" /></svg>
              1cr = ১ টাকা
            </span>
          </div>
        </section>

        {/* POSTER WALL */}
        <section className="bp-sec bp-sec-alt" id="showcase">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>টেমপ্লেট আর আসল আউটপুট</h2>
              <p>ফেস্টিভ্যাল টেমপ্লেট বেছে নিন, অথবা দেখুন অন্য দোকানদাররা কী বানাচ্ছে</p>
            </div>
            <div className="bp-wall">
              <div className="bp-tile bp-w-eid">
                <div className="bp-media" style={{ flex: 1 }}>
                  <img src="/redesign/poster-eid-600.avif" alt="ঈদ টেমপ্লেটের পোস্টার কভার" loading="lazy" width="600" height="800" />
                </div>
                <div className="bp-cap"><span>ঈদ মুবারক সেল</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>টেমপ্লেট</span></div>
              </div>
              <div className="bp-tile bp-w-bok">
                <div className="bp-media">
                  <img src="/redesign/poster-boishakh-600.avif" alt="পহেলা বৈশাখ টেমপ্লেটের পোস্টার কভার" loading="lazy" width="600" height="800" />
                </div>
                <div className="bp-cap"><span>পহেলা বৈশাখ</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>টেমপ্লেট</span></div>
              </div>
              <div className="bp-tile bp-w-r1">
                <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                  <LazyVideo
                    src={`${process.env.NEXT_PUBLIC_TV_CDN ?? ''}/tv/shorts-agent-autonomous-employee.mp4`}
                    poster="/redesign/hero-bazaar-640.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    width={640}
                    height={360}
                    aria-label="Hostamar দিয়ে বানানো আসল ভিডিও"
                  />
                  <span className="bp-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" /></svg></span>
                </div>
                <div className="bp-cap"><span>Hostamar দিয়ে বানানো আসল ভিডিও</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>আসল আউটপুট</span></div>
              </div>
              <div className="bp-tile bp-w-r2">
                <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                  <LazyVideo
                    src="/demo-30s.mp4"
                    poster="/redesign/hero-bazaar-640.jpg"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    width={640}
                    height={360}
                    aria-label="লাইভ পাইপলাইন ডেমো — ব্রিফ থেকে GPU রেন্ডার"
                  />
                  <span className="bp-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" /></svg></span>
                </div>
                <div className="bp-cap"><span>লাইভ পাইপলাইন ডেমো</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>নিজের GPU-তে রেন্ডার</span></div>
              </div>
            </div>
            <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
              <Link href="/showcase" className="bp-btn bp-btn-ghost">সব দেখুন</Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bp-sec" id="how">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>কীভাবে কাজ করে</h2>
              <p>মাত্র ৩ ধাপে ভাইরাল ভিডিও</p>
            </div>
            <div className="bp-how-row">
              <div className="bp-how-num" aria-hidden="true">১</div>
              <div>
                <h3>টেমপ্লেট বাছাই করুন</h3>
                <p>৫০+ বাংলা ফেস্টিভ্যাল টেমপ্লেট (ঈদ, বৈশাখ, ১১.১১) থেকে বেছে নিন অথবা আপনার পণ্য দিয়ে শুরু করুন</p>
              </div>
            </div>
            <div className="bp-how-row">
              <div className="bp-how-num" aria-hidden="true">২</div>
              <div>
                <h3>বাংলায় লিখুন</h3>
                <p>আপনার অফার বাংলায় লিখুন। AI স্ক্রিপ্ট লিখে দেবে আর স্বাভাবিক বাংলা ভয়েসওভার বানাবে</p>
              </div>
            </div>
            <div className="bp-how-row">
              <div className="bp-how-num" aria-hidden="true">৩</div>
              <div>
                <h3>৩০ সেকেন্ডে রেডি</h3>
                <p>ভিডিও ডাউনলোড করুন আর bKash, Nagad বা Rocket দিয়ে পেমেন্ট করুন। ক্রেডিট কার্ড লাগে না</p>
              </div>
            </div>
          </div>
        </section>

        {/* BUNDLE */}
        <section className="bp-sec bp-sec-alt" id="bundle">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>একটি সাবস্ক্রিপশনে সব ৭টি প্রোডাক্ট</h2>
              <p>প্রতিটি প্ল্যানে AI ভিডিও + হোস্টিং + Chat + Browser + IDE একসাথে। আলাদা করে কিছু কিনতে হবে না। bKash, Nagad, Rocket সাপোর্টেড</p>
            </div>
            <div className="bp-bundle">
              <div className="bp-tile bp-span2">
                <span className="bp-tag">AI ভিডিও</span>
                <h3>আপনার ব্র্যান্ড, সব ভিডিওতে</h3>
                <p>লোগো, কালার, ফন্ট একবার সেট করুন, প্রতিটি ভিডিওতে অটো অ্যাপ্লাই হবে</p>
                <div className="bp-frame" style={{ marginTop: '1rem', padding: 8 }}>
                  <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                    <img src="/redesign/poster-boishakh-600.jpg" alt="Hostamar দিয়ে বানানো আসল ভিডিওর পোস্টার" loading="lazy" width="640" height="360" />
                    <span className="bp-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" /></svg></span>
                  </div>
                </div>
                <div style={{ marginTop: '.9rem' }}>
                  <Link href="/generate" className="bp-btn bp-btn-primary">ভিডিও বানান</Link>
                </div>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">ক্লাউড হোস্টিং</span>
                <h3>হোস্টিং, ৫GB ফ্রি</h3>
                <ul className="bp-check">
                  <li><svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 mr-2 text-[#0E7C3A] flex-shrink-0"><path d="M5 12l4 4L19 7" /></svg>Vercel এজ + Cloudflare CDN, ফ্রি SSL</li>
                  <li><svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 mr-2 text-[#0E7C3A] flex-shrink-0"><path d="M5 12l4 4L19 7" /></svg>বাংলা ড্যাশবোর্ড, ইংরেজি না বুঝলেও চলবে</li>
                  <li><svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 mr-2 text-[#0E7C3A] flex-shrink-0"><path d="M5 12l4 4L19 7" /></svg>ফ্রি SSL, অটো-ইনস্টল</li>
                  <li><svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 mr-2 text-[#0E7C3A] flex-shrink-0"><path d="M5 12l4 4L19 7" /></svg>গিট পুশে লাইভ, জিরো-ডাউনটাইম ডিপ্লয়</li>
                </ul>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <Link href="/hosting" className="bp-btn bp-btn-ghost">হোস্টিং দেখুন</Link>
                </div>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">চ্যাট</span>
                <h3>AI অ্যাসিস্ট্যান্ট, ৳0</h3>
                <p>বাংলা ভয়েস ইনপুটসহ দিনে ১০০টি মেসেজ, বাংলাদেশের জন্য বিশেষভাবে তৈরি</p>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <Link href="/chat" className="bp-btn bp-btn-ghost">চ্যাট খুলুন</Link>
                </div>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">ব্রাউজার</span>
                <h3>প্রাইভেট ব্রাউজার</h3>
                <p>ব্রাউজারেই Pyodide Python চলে, pandas ও numpy ইনস্টল ছাড়াই, ইতিহাস প্রাইভেট</p>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <Link href="/browser" className="bp-btn bp-btn-ghost">ব্রাউজার খুলুন</Link>
                </div>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">Dev IDE</span>
                <h3>Dev IDE, ৳0</h3>
                <p>লাইভ এডিটর ও প্রিভিউ, Replit এর $25 সাবস্ক্রিপশনের বিকল্প</p>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <Link href="/dev" className="bp-btn bp-btn-ghost">IDE খুলুন</Link>
                </div>
              </div>
              <div className="bp-tile bp-span2">
                <span className="bp-tag">গেমিং</span>
                <h3>ক্লাউড গেমিং</h3>
                <p>ডাউনলোড ছাড়াই HTML5 গেম, ব্রাউজারেই ইনস্ট্যান্ট লঞ্চ, টুর্নামেন্ট হোস্ট করুন</p>
                <div style={{ marginTop: '.9rem' }}>
                  <Link href="/game" className="bp-btn bp-btn-ghost">গেম খেলুন</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING — Bangla anchoring: Premium first, Business middle (MOST POPULAR), Starter last */}
        <section id="pricing" className="bg-[#FCFCF9] px-5 py-16">
          <div className="mx-auto max-w-[1120px]">
            <h2 className="mb-10 text-center font-hind text-3xl font-bold tracking-tight text-[#18181B]">
              সহজ প্রাইসিং
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {/* 1. PREMIUM - BIG FIRST (Anchoring) */}
              <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-7">
                <h3 className="font-hind text-xl font-bold text-[#18181B]">প্রিমিয়াম</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-hind text-4xl font-bold text-[#18181B]">৪,৯৯৯ টাকা</span>
                  <span className="text-sm text-zinc-500">/ মাস</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500 line-through"> আগের দাম ১০,০০০ টাকা</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {[
                    '১০টা ৩০ সেকেন্ডের ভিডিও',
                    'বাংলা সহ যেকোনো ভাষায় ভয়েস',
                    'আপনার ওয়েবসাইটের সাথে জোড়া দেওয়ার সিস্টেম',
                    'আপনার ভিডিও শুধু আপনার থাকবে, আমরা রাখবো না',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 text-[#0E7C3A]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-zinc-600"><strong>কার জন্য:</strong> যারা প্রতিদিন ভিডিও চায়, দোকান আর ফেসবুকের জন্য।</p>
                <a
                  href="/signup"
                  className="mt-7 block w-full rounded-full bg-[#0E7C3A] py-3 text-center font-semibold text-white transition hover:bg-[#0A5A2B]"
                >
                  প্রিমিয়াম নির্বাচন করুন
                </a>
              </div>

              {/* 2. BUSINESS - MIDDLE (MOST POPULAR) */}
              <div className="relative flex flex-col rounded-2xl border-2 border-[#0E7C3A] bg-white p-7 shadow-xl scale-105 z-10">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#E4312B] px-3 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </span>
                <h3 className="font-hind text-xl font-bold text-[#18181B]">ব্যবসা</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-hind text-4xl font-bold text-[#18181B]">১,৯৯৯ টাকা</span>
                  <span className="text-sm text-zinc-500">/ মাস</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500 line-through"> আগের দাম ৪,৯৯৯ টাকা</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {[
                    '৫টা ৩০ সেকেন্ডের ভিডিও',
                    'বাংলা ভয়েস ক্লোনিং - আপনার গলায়',
                    '১ দিনের মধ্যে ডেলিভারি',
                    '১ বার ফ্রিতে বদলানো যাবে',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 text-[#0E7C3A]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-zinc-600"><strong>কার জন্য:</strong> বগুড়ার দোকান, বুটিক, খাবারের দোকান, কোচিং - যারা ফেসবুকে বিক্রি বাড়াতে চায়।</p>
                <a
                  href="/signup"
                  className="mt-7 block w-full rounded-full bg-[#0E7C3A] py-3 text-center font-semibold text-white transition hover:bg-[#0A5A2B]"
                >
                  ব্যবসা নির্বাচন করুন
                </a>
              </div>

              {/* 3. STARTER - SMALL LAST */}
              <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-7">
                <h3 className="font-hind text-xl font-bold text-[#18181B]">শুরু</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-hind text-4xl font-bold text-[#18181B]">৫৯৯ টাকা</span>
                  <span className="text-sm text-zinc-500">/ মাস</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500 line-through"> আগের দাম ৯৯৯ টাকা</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {[
                    '১টা ৩০ সেকেন্ডের ভিডিও',
                    'বাংলা ভয়েস',
                    '২ দিনের মধ্যে ডেলিভারি',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 text-[#0E7C3A]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-zinc-600"><strong>কার জন্য:</strong> প্রথমবার দেখতে চান কেমন হয়।</p>
                <a
                  href="/signup"
                  className="mt-7 block w-full rounded-full border border-zinc-300 py-3 text-center font-semibold text-[#18181B] transition hover:bg-zinc-100"
                >
                  শুরু করুন
                </a>
              </div>
            </div>

            {/* Scarcity / Loss fear text */}
            <div className="mt-8 text-center">
              <p className="text-lg font-semibold text-[#E4312B]">
                আজ না নিলে কাল এই দাম থাকবে না। প্রতিদিন মাত্র ৫ জনকে নিই, কারণ আমাদের কম্পিউটার একটাই।
              </p>
            </div>

            {/* Why Section */}
            <div className="mt-12 text-center">
              <h3 className="font-hind text-2xl font-bold text-[#18181B]">আমরা কেন আলাদা</h3>
              <p className="mt-3 text-base text-zinc-600 max-w-2xl mx-auto">
                আমরা আপনার ভিডিও আমেরিকায় পাঠাই না। বাংলাদেশ আর ইউরোপে বানাই। আপনার মুখ, আপনার গলা, আপনারই থাকে।
              </p>
            </div>

            {/* Testimonial */}
            <div className="mt-10 text-center">
              <blockquote className="text-lg text-zinc-700 italic max-w-2xl mx-auto">
                &ldquo;বগুড়ায় বসে দুবাইয়ের কাস্টমারকে ভিডিও পাঠিয়েছি, সে অর্ডার দিয়েছে&rdquo;
                <footer className="mt-2 text-sm text-zinc-500 not-italic">— রহিম, বগুড়া</footer>
              </blockquote>
            </div>

            {/* Final CTA */}
            <div className="mt-12 text-center">
              <p className="text-xl font-semibold text-[#18181B]">
                আজকের ৫টা জায়গার মধ্যে ১টা আপনার জন্য রাখি?
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-[#0E7C3A] px-7 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.6)] transition hover:bg-[#0A5A2B]"
              >
                আমার ভিডিও বানান - ৩০ সেকেন্ডে শুরু করুন
              </Link>
            </div>

            {/* Real payment wordmarks — no broken emoji */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-sm text-zinc-500">লোকাল পেমেন্ট সাপোর্টেড</p>
              <div className="flex items-center gap-6 text-xl font-bold">
                <span className="text-[#0E7C3A]">bKash</span>
                <span className="text-[#E4312B]">Nagad</span>
                <span className="text-[#7B2FF7]">Rocket</span>
              </div>
            </div>
          </div>
        </section>

        {/* BETA STATUS */}
        <section className="bp-sec bp-sec-alt" id="reviews">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>BETA — এখন যা লাইভ চলছে</h2>
              <p>{toBn(models)} মডেল, {toBn(TOOL_COUNT)} AI টুল, {toBn(videos)}টি রেন্ডার করা ভিডিও — সব আসল, লাইভ</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              <div className="bp-tile">
                <span className="bp-tag">AI ভিডিও মেকার</span>
                <h3>ছবি দিন, ভিডিও নিন</h3>
                <p>পণ্যের ছবি আপলোড করুন — AI স্ক্রিপ্ট, বাংলা ভয়েসওভার, সাবটাইটেল ও লোগো যোগ করে মার্কেটিং ভিডিও বানায়।</p>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">সব-ইন-ওয়ান</span>
                <h3>এক সাবস্ক্রিপশন, ৭ প্রোডাক্ট</h3>
                <p>হোস্টিং, ভিডিও, চ্যাট, ব্রাউজার, IDE ও গেমিং — এক ড্যাশবোর্ডে, একটাই বিল।</p>
              </div>
              <div className="bp-tile">
                <span className="bp-tag">লোকাল পেমেন্ট</span>
                <h3>bKash Send Money</h3>
                <p>bKash 01822417463 / Nagad / Rocket — Send Money করে TrxID পাঠান, ম্যানুয়ালি ভেরিফাই করে অ্যাকাউন্ট অ্যাকটিভ করা হয়।</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bp-sec" id="faq">
          <div className="bp-wrap" style={{ maxWidth: 820 }}>
            <div className="bp-sec-head">
              <h2>সাধারণ প্রশ্ন</h2>
              <p>ওনারদের সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্ন। আরও জানতে সাপোর্টে নক দিন</p>
            </div>
            <div className="bp-faq">
              {featured.map((f) => (
                <details key={f.q}>
                  <summary>
                    {f.q}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <div style={{ marginTop: '1.1rem' }}>
              <Link href="/faq" className="bp-btn bp-btn-ghost">সব ২৫টি প্রশ্ন দেখুন</Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bp-cta-wrap">
          <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
          <div className="bp-cta-band">
            <h2>আজই শুরু করুন, ৳0 থেকে</h2>
            <p>৩০ সেকেন্ডে প্রথম ভিডিও বানান। ক্রেডিট কার্ড লাগে না</p>
            <Link href="/signup" className="bp-btn bp-btn-light">ফ্রি শুরু করুন</Link>
          </div>
          <div className="bp-scallop" aria-hidden="true" />
        </div>
      </main>

      <BazaarFooter />
    </>
  );
}
