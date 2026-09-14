import Link from 'next/link';
import { FAQS } from '@/lib/faqs';
import BazaarNav from '@/components/home/BazaarNav';
import BazaarFooter from '@/components/home/BazaarFooter';

// Bazaar Poster homepage (Direction C, approved 2026-09-14).
// Server component: FAQ uses native <details>, so no client state needed.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar',
  description: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং, এক সাবস্ক্রিপশনে',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '599', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Pro', price: '1299', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Business', price: '2999', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
  ],
  aggregateOffer: { '@type': 'AggregateOffer', lowPrice: '599', highPrice: '2999', priceCurrency: 'BDT' },
  mainEntity: FAQS.slice(0, 6).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>
);

export default function HomePage() {
  const featured = FAQS.slice(0, 5);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <BazaarNav />

      <main className="bp-theme">
        {/* HERO */}
        <section className="bp-hero">
          <div className="bp-wrap bp-hero-grid">
            <div className="bp-rise">
              <span className="bp-eyebrow">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
                বাংলাদেশের জন্য তৈরি
              </span>
              <h1>
                AI দিয়ে মার্কেটিং ভিডিও বানান <span className="bp-accent">৩০ সেকেন্ডে</span>
              </h1>
              <p className="bp-hero-sub">পণ্যের ছবি দিন, AI বাকিটা সামলাবে, বাংলা ভয়েসওভার, সাবটাইটেল ও লোগো সহ</p>
              <div className="bp-hero-cta">
                <Link href="/generate" className="bp-btn bp-btn-primary" data-ga="generate_click">ভিডিও বানান, ১০০ ক্রেডিট</Link>
                <Link href="/features" className="bp-btn bp-btn-ghost">সব ৩০+ ফিচার দেখুন</Link>
              </div>
            </div>
            <div className="bp-hero-poster bp-rise bp-d2">
              <svg className="bp-sunburst" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={i} x1="50" y1="50" x2={50 + 50 * Math.cos((i * Math.PI) / 6)} y2={50 + 50 * Math.sin((i * Math.PI) / 6)} />
                ))}
              </svg>
              <div className="bp-frame bp-frame-tilt-r">
                <div className="bp-media">
                  <img src="/redesign/hero-bazaar.jpg" alt="বাংলাদেশি উৎসবের বাজারের পোস্টার-ধাঁচের ইলাস্ট্রেশন" width="1024" height="640" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF STAMPS */}
        <section className="bp-sec" style={{ paddingBlock: '0.6rem 2rem' }} aria-label="আস্থার প্রমাণ">
          <div className="bp-wrap bp-stamp-row bp-rise bp-d3" style={{ justifyContent: 'center' }}>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
              ৪৬টি লাইভ রেন্ডার — /tv
            </span>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l-5 6 5 6M16 6l5 6-5 6" /></svg>
              ১০৯ AI টুলস, এক API
            </span>
            <span className="bp-stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
              bKash, Nagad, Rocket
            </span>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 8.5A2.5 2.5 0 0 0 7.1 21h9.8a2.5 2.5 0 0 0 2.1-3.5L14 9V3" /></svg>
              BETA, নতুন ফিচার চলছে
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
                  <img src="/redesign/poster-eid.jpg" alt="ঈদ টেমপ্লেটের পোস্টার কভার" loading="lazy" width="846" height="1128" />
                </div>
                <div className="bp-cap"><span>ঈদ মুবারক সেল</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>টেমপ্লেট</span></div>
              </div>
              <div className="bp-tile bp-w-bok">
                <div className="bp-media">
                  <img src="/redesign/poster-boishakh.jpg" alt="পহেলা বৈশাখ টেমপ্লেটের পোস্টার কভার" loading="lazy" width="846" height="1128" />
                </div>
                <div className="bp-cap"><span>পহেলা বৈশাখ</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>টেমপ্লেট</span></div>
              </div>
              <div className="bp-tile bp-w-r1">
                <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                  <img src="/showcase/cmtmt2jteyldrvv.jpg" alt="Hostamar দিয়ে বানানো আসল ভিডিওর পোস্টার" loading="lazy" width="640" height="360" />
                  <span className="bp-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" /></svg></span>
                </div>
                <div className="bp-cap"><span>Hostamar দিয়ে বানানো আসল ভিডিও</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>আসল আউটপুট</span></div>
              </div>
              <div className="bp-tile bp-w-r2">
                <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                  <img src="/showcase/cmt236ien0000nde0p88smx4j.jpg" alt="Hostamar দিয়ে বানানো আসল ভিডিওর পোস্টার" loading="lazy" width="640" height="360" />
                  <span className="bp-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7V5z" /></svg></span>
                </div>
                <div className="bp-cap"><span>আসল ভিডিও</span><span className="bp-muted" style={{ fontSize: '.8rem' }}>আসল আউটপুট</span></div>
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
              <h2>একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট</h2>
              <p>প্রতিটি প্ল্যানে AI ভিডিও + হোস্টিং + Chat + Browser + IDE একসাথে। আলাদা করে কিছু কিনতে হবে না। bKash, Nagad, Rocket সাপোর্টেড</p>
            </div>
            <div className="bp-bundle">
              <div className="bp-tile bp-span2">
                <span className="bp-tag">AI ভিডিও</span>
                <h3>আপনার ব্র্যান্ড, সব ভিডিওতে</h3>
                <p>লোগো, কালার, ফন্ট একবার সেট করুন, প্রতিটি ভিডিওতে অটো অ্যাপ্লাই হবে</p>
                <div className="bp-frame" style={{ marginTop: '1rem', padding: 8 }}>
                  <div className="bp-media" style={{ aspectRatio: '16/9' }}>
                    <img src="/showcase/cmtmt2jteyldrvv.jpg" alt="Hostamar দিয়ে বানানো আসল ভিডিওর পোস্টার" loading="lazy" width="640" height="360" />
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
                  <li>{CHECK}Vercel এজ + Cloudflare CDN, ফ্রি SSL</li>
                  <li>{CHECK}বাংলা ড্যাশবোর্ড, ইংরেজি না বুঝলেও চলবে</li>
                  <li>{CHECK}ফ্রি SSL, অটো-ইনস্টল</li>
                  <li>{CHECK}গিট পুশে লাইভ, জিরো-ডাউনটাইম ডিপ্লয়</li>
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

        {/* PRICING */}
        <section className="bp-sec" id="pricing">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>সহজ প্রাইসিং</h2>
              <p>লোকাল পেমেন্ট সাপোর্টেড, লুকানো চার্জ নেই</p>
            </div>
            <div className="bp-plans">
              <div className="bp-tile bp-plan">
                <span className="bp-plan-name">ফ্রি</span>
                <div className="bp-price">৳0</div>
                <ul className="bp-check">
                  <li>{CHECK}৫টি AI ভিডিও / মাস</li>
                  <li>{CHECK}১GB হোস্টিং ফ্রি</li>
                  <li>{CHECK}চ্যাট বেসিক</li>
                  <li>{CHECK}720p এক্সপোর্ট, ছোট ওয়াটারমার্ক</li>
                  <li>{CHECK}১টি ব্র্যান্ড কিট</li>
                </ul>
                <Link href="/signup" className="bp-btn bp-btn-ghost">ফ্রি শুরু করুন</Link>
              </div>
              <div className="bp-tile bp-plan bp-plan-featured">
                <span className="bp-rosette">সবচেয়ে জনপ্রিয়</span>
                <span className="bp-plan-name">স্টার্টার</span>
                <div className="bp-price">৳599 <small>/ মাস</small></div>
                <ul className="bp-check">
                  <li>{CHECK}১০০ AI ভিডিও</li>
                  <li>{CHECK}৫GB হোস্টিং</li>
                  <li>{CHECK}চ্যাট Pro + ব্রাউজার</li>
                  <li>{CHECK}১০৮০p, কোনো ওয়াটারমার্ক নয়</li>
                  <li>{CHECK}বাংলা ভয়েস অ্যাক্সেস</li>
                </ul>
                <Link href="/pricing" className="bp-btn bp-btn-primary" data-ga="pricing_click">নির্বাচন করুন</Link>
              </div>
              <div className="bp-tile bp-plan">
                <span className="bp-plan-name">বিজনেস</span>
                <div className="bp-price">৳2,999 <small>/ মাস</small></div>
                <ul className="bp-check">
                  <li>{CHECK}৩০০ AI ভিডিও</li>
                  <li>{CHECK}২০GB হোস্টিং</li>
                  <li>{CHECK}সবকিছু আনলিমিটেড, 4K এক্সপোর্ট</li>
                  <li>{CHECK}গেম টুর্নামেন্ট হোস্ট করুন</li>
                  <li>{CHECK}টিম ৫ জন + প্রায়োরিটি সাপোর্ট</li>
                </ul>
                <Link href="/pricing" className="bp-btn bp-btn-ghost" data-ga="pricing_click">নির্বাচন করুন</Link>
              </div>
            </div>
            <div className="bp-fine">
              <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" /></svg>সুরক্ষিত পেমেন্ট</span>
              <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>৭ দিনের মানি-ব্যাক গ্যারান্টি</span>
              <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></svg>bKash / Nagad / Rocket</span>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="bp-sec bp-sec-alt" id="reviews">
          <div className="bp-wrap">
            <div className="bp-sec-head">
              <h2>BETA — এখন কী পাচ্ছেন</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
              <div className="bp-quote">
                <blockquote>ছবি আপলোড করুন — AI স্ক্রিপ্ট, বাংলা ভয়েসওভার, সাবটাইটেল ও লোগো যোগ করে মার্কেটিং ভিডিও বানায়।</blockquote>
                <cite><b>AI ভিডিও মেকার</b> <br />BETA ফিচার</cite>
              </div>
              <div className="bp-quote">
                <blockquote>হোস্টিং, ভিডিও, চ্যাট, ব্রাউজার ও IDE — এক সাবস্ক্রিপশনে, এক ড্যাশবোর্ডে।</blockquote>
                <cite><b>সব-ইন-ওয়ান</b> <br />BETA ফিচার</cite>
              </div>
              <div className="bp-quote">
                <blockquote>bKash / Nagad / Rocket Send Money দিয়ে পেমেন্ট — ম্যানুয়ালি ভেরিফাই করে একাউন্ট একটিভ করা হয়।</blockquote>
                <cite><b>লোকাল পেমেন্ট</b> <br />BETA ফিচার</cite>
              </div>
            </div>
            <p className="bp-disclosure">BETA: রিয়েল ইউজার রিভিউ এখনো সংগ্রহাধীন — উপরের বর্ণনা পণ্যের ফিচার, কোনো কাস্টমারের উক্তি নয়।</p>
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
