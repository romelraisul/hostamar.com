import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
  description:
    'Hostamar এর গল্প: Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। ৫০০+ SME এর ভিডিও, হোস্টিং, চ্যাট এক জায়গায় — Silicon Valley এর জন্য নয়, বাংলাদেশের জন্য।',
  alternates: { canonical: 'https://hostamar.com/about' },
  openGraph: {
    title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
    description:
      'Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। বাংলা First • bKash First • Simple First — ৫০০+ SME এর অল-ইন-ওয়ান OS।',
    url: 'https://hostamar.com/about',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630, alt: 'About Hostamar' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Hostamar — বাংলাদেশের জন্য তৈরি | Hostamar',
    description: 'Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড — বাংলাদেশের জন্য অল-ইন-ওয়ান OS।',
    images: ['https://hostamar.com/opengraph-image'],
  },
  keywords: ['about hostamar', 'hostamar story', 'bangladesh startup', 'bogura', 'bdix hosting', 'bangla ai platform'],
}

// Bazaar Poster about page (Direction C, 2026-09). Previous client content:
// archive/other-pages/about-content.tsx (kept for reference).
export default function AboutPage() {
  return (
    <div className="bp-theme">
      <div className="bp-page-hero">
        <div className="bp-wrap">
          <h1>বাংলাদেশে তৈরি, বাংলাদেশের জন্য</h1>
          <p>Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। Silicon Valley এর জন্য নয়, বাংলাদেশের জন্য</p>
        </div>
      </div>

      <section className="bp-sec" aria-label="আমাদের গল্প">
        <div className="bp-wrap">
          <div className="bp-about-grid">
            <div>
              <h2 className="bp-h2">
                বাংলাদেশি ব্যবসার জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং, এক সাবস্ক্রিপশনে
              </h2>
              <p className="bp-muted" style={{ fontSize: '1.05rem' }}>
                ৫০০+ SME এর ভিডিও, হোস্টিং আর চ্যাট এক জায়গায়। ইন্টারন্যাশনাল কার্ড লাগবে না, লোকাল পেমেন্টে ইনস্ট্যান্ট একটিভেশন
              </p>
              <div style={{ display: 'flex', gap: '.9rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <Link href="/generate" className="bp-btn bp-btn-primary">ফ্রি শুরু করুন</Link>
                <Link href="/pricing" className="bp-btn bp-btn-ghost">প্রাইসিং দেখুন</Link>
              </div>
            </div>
            <div className="bp-frame bp-frame-tilt-r">
              <div className="bp-media">
                <img src="/redesign/hero-boutique.jpg" alt="ঢাকার একটি ফ্যাশন বুটিকের মালিক ফোন দিয়ে পণ্যের ভিডিও তৈরি করছেন" loading="lazy" width="1400" height="875" />
              </div>
            </div>
          </div>

          <div className="bp-stamp-row" style={{ marginTop: '2.4rem', justifyContent: 'flex-start' }}>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
              বগুড়া, বাংলাদেশ, সদর দপ্তর
            </span>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
              Dhaka BDIX এ হোস্টেড
            </span>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
              ৫০০+ SME
            </span>
            <span className="bp-stamp">
              <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              সাপোর্ট সকাল ৯টা - রাত ১০টা
            </span>
          </div>

          <div className="bp-value-grid">
            <div className="bp-tile">
              <span className="bp-tag">First</span>
              <h3>বাংলা First</h3>
              <p>ন্যাচারাল বাংলা ভয়েস, Perfect Bangla Font, বাংলা cPanel — ইংরেজি না বুঝলেও সব চলবে</p>
            </div>
            <div className="bp-tile">
              <span className="bp-tag">First</span>
              <h3>bKash First</h3>
              <p>bKash, Nagad, Rocket সাপোর্টেড। কার্ড ও ব্যাংক ট্রান্সফারও চলে, কিন্তু BD SME-এর জন্য bKash সবচেয়ে সহজ</p>
            </div>
            <div className="bp-tile">
              <span className="bp-tag">First</span>
              <h3>Simple First</h3>
              <p>এক সাবস্ক্রিপশনে ছয় প্রোডাক্ট। আলাদা করে কিছু কিনতে হবে না, লুকানো চার্জ নেই</p>
            </div>
            <div className="bp-tile">
              <span className="bp-tag">নিজেদের</span>
              <h3>বাংলাদেশে তৈরি</h3>
              <p>বগুড়া থেকে বানানো, বাংলাদেশি দোকানদার আর ক্রিয়েটরদের জন্য বিশেষভাবে তৈরি ফিচার</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bp-cta-wrap">
        <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
        <div className="bp-cta-band">
          <h2>গল্পটা আপনারও তো</h2>
          <p>আজই শুরু করুন, ৳0 থেকে। ক্রেডিট কার্ড লাগে না</p>
          <Link href="/signup" className="bp-btn bp-btn-light">ফ্রি শুরু করুন</Link>
        </div>
        <div className="bp-scallop" aria-hidden="true" />
      </div>
    </div>
  );
}
