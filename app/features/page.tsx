import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ফিচারস - AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং | Hostamar',
  description:
    'বাংলাদেশের জন্য বিশেষভাবে তৈরি ফিচার: ন্যাচারাল বাংলা ভয়েসওভার, অটো সাবটাইটেল + হুক জেনারেটর, ব্র্যান্ড কিট, ৫০+ ফেস্টিভ্যাল টেমপ্লেট, বাংলা cPanel, BDIX ২০ms হোস্টিং, প্রাইভেট AI ব্রাউজার।',
  alternates: { canonical: 'https://hostamar.com/features' },
}

// Bazaar Poster features page (Direction C, 2026-09). Static server component;
// the old tabbed client version is preserved in git history on main.

const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>
);

export default function FeaturesPage() {
  return (
    <div className="bp-theme">
      <div className="bp-page-hero">
        <div className="bp-wrap">
          <h1>ফিচারস</h1>
          <p>বাংলাদেশের জন্য বিশেষভাবে তৈরি ফিচার, সব এক অ্যাকাউন্টে</p>
        </div>
      </div>

      <section className="bp-sec" aria-label="ফিচার তালিকা">
        <div className="bp-wrap">
          <div className="bp-feat-split">
            <div>
              <h3>ন্যাচারাল বাংলা ভয়েসওভার</h3>
              <p>রোবটিক নয়, ঢাকাইয়া, চট্টগ্রামের টান সহ ৬টি বাংলা ভয়েস। আপনার স্ক্রিপ্ট পড়বে একদম মানুষের মতো। মূলত বাংলা (পুরুষ/মহিলা, সুমাইয়া), ইংরেজি ও হিন্দি সাপোর্টেড</p>
              <ul>
                <li>{CHECK}৬টি বাংলা ভয়েস, ঢাকাইয়া ও চট্টগ্রামের টান সহ</li>
                <li>{CHECK}বাংলা ভয়েস ইনপুট</li>
                <li>{CHECK}ElevenLabs + OpenAI মডেল</li>
              </ul>
            </div>
            <div className="bp-art" aria-hidden="true">
              <svg viewBox="0 0 200 90"><path d="M14 70 C40 20, 70 20, 96 52 S152 84, 186 40" fill="none" stroke="#0E7C3A" strokeWidth="6" strokeLinecap="round" /><circle cx="96" cy="52" r="9" fill="#F59E0B" stroke="#1C1917" strokeWidth="3" /><circle cx="14" cy="70" r="6" fill="#0E7C3A" opacity=".45" /><circle cx="186" cy="40" r="6" fill="#0E7C3A" opacity=".45" /></svg>
            </div>
          </div>

          <div className="bp-feat-split bp-feat-split-flip">
            <div className="bp-art" aria-hidden="true">
              <svg viewBox="0 0 200 90"><rect x="30" y="12" width="140" height="52" rx="8" fill="none" stroke="#1C1917" strokeWidth="4" /><path d="M70 78h60M80 64v14M120 64v14" stroke="#1C1917" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M50 30h60M50 42h40" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" /></svg>
            </div>
            <div>
              <h3>অটো সাবটাইটেল + হুক জেনারেটর</h3>
              <p>ক্যাপশন, ভাইরাল হুক, CTA, ফেসবুক রিলস ও টিকটকের জন্য অপটিমাইজড। আপনার টপিক দিয়ে স্ক্রল-স্টপিং হুক বানায়</p>
              <ul>
                <li>{CHECK}ফেসবুক রিলস ও টিকটক সাইজ</li>
                <li>{CHECK}স্ক্রল-স্টপিং হুক</li>
                <li>{CHECK}CTA অপটিমাইজেশন</li>
              </ul>
            </div>
          </div>

          <div className="bp-feat-split">
            <div>
              <h3>ব্র্যান্ড কিট ও ৫০+ টেমপ্লেট</h3>
              <p>লোগো, কালার, ফন্ট একবার সেট করুন, প্রতিটি ভিডিওতে অটো অ্যাপ্লাই হবে। আপনার ব্র্যান্ড, সব ভিডিওতে</p>
              <ul>
                <li>{CHECK}১টি ব্র্যান্ড কিট (ফ্রি), আনলিমিটেড (পেইড)</li>
                <li>{CHECK}ঈদ, বৈশাখ, 11.11 সহ ৫০+ টেমপ্লেট</li>
                <li>{CHECK}১০৮০p ও 4K এক্সপোর্ট</li>
              </ul>
            </div>
            <div className="bp-mini-fests" style={{ marginTop: 0 }} aria-label="টেমপ্লেট ক্যাটাগরি">
              <div className="bp-mini-fest"><b>ঈদ মুবারক সেল</b><span>ঈদ কালেকশন</span></div>
              <div className="bp-mini-fest"><b>পহেলা বৈশাখ</b><span>নববর্ষ</span></div>
              <div className="bp-mini-fest"><b>মেগা সেল</b><span>11.11</span></div>
              <div className="bp-mini-fest"><b>শীতের জ্যাকেট</b><span>সিজনাল</span></div>
              <div className="bp-mini-fest"><b>বিউটি গ্লো</b><span>কসমেটিকস</span></div>
              <div className="bp-mini-fest"><b>ফুড ডেলিভারি</b><span>রেস্টুরেন্ট</span></div>
            </div>
          </div>

          <div className="bp-feat-split bp-feat-split-flip">
            <div className="bp-art" aria-hidden="true">
              <svg viewBox="0 0 200 90"><rect x="24" y="16" width="60" height="58" rx="8" fill="none" stroke="#1C1917" strokeWidth="4" /><rect x="116" y="16" width="60" height="58" rx="8" fill="none" stroke="#1C1917" strokeWidth="4" opacity=".45" /><path d="M40 36h28M40 48h20M132 36h28M132 48h20" stroke="#0E7C3A" strokeWidth="5" strokeLinecap="round" /></svg>
            </div>
            <div>
              <h3>বাংলা cPanel ও BDIX হোস্টিং</h3>
              <p>ফাইল, ডেটাবেস, ইমেইল সব বাংলায়। ইংরেজি না বুঝলেও চলবে। বাংলাদেশে BDIX ২০ms লেটেন্সি, NVMe SSD, BD ভিজিটরের জন্য সবচেয়ে ফাস্ট লোড</p>
              <ul>
                <li>{CHECK}Let&apos;s Encrypt ফ্রি SSL, অটো-ইনস্টল</li>
                <li>{CHECK}LiteSpeed + LSCache + JetBackup</li>
                <li>{CHECK}ফ্রি মাইগ্রেশন, পুরানো সাইট আমরা সামলাই</li>
              </ul>
            </div>
          </div>

          <div className="bp-feat-split">
            <div>
              <h3>প্রাইভেট AI ব্রাউজার ও টুলস</h3>
              <p>ব্রাউজারের ইতিহাস আমাদের প্রাইভেট Ollama মডেলে থাকে, কোথাও শেয়ার হয় না। ব্রাউজারেই Pyodide Python, pandas ও numpy চলে, ইনস্টল লাগে না</p>
              <ul>
                <li>{CHECK}PDF আপলোড করুন, বাংলায় প্রশ্ন করুন, সামারি পান</li>
                <li>{CHECK}ভিডিও লিংক পেস্ট করলেই বাংলা সামারি</li>
                <li>{CHECK}Dev IDE, Replit এর $25 সাবস্ক্রিপশনের বিকল্প</li>
              </ul>
            </div>
            <div className="bp-art" aria-hidden="true">
              <svg viewBox="0 0 200 90"><circle cx="100" cy="45" r="34" fill="none" stroke="#1C1917" strokeWidth="4" /><path d="M66 45h68M100 11c14 10 14 58 0 68M100 11c-14 10-14 58 0 68" fill="none" stroke="#2563EB" strokeWidth="4" /></svg>
            </div>
          </div>
        </div>
      </section>

      <div className="bp-cta-wrap">
        <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
        <div className="bp-cta-band">
          <h2>সব ৩০+ ফিচার এক প্ল্যানে</h2>
          <p>৳0 থেকে শুরু করুন, ক্রেডিট কার্ড লাগে না</p>
          <Link href="/signup" className="bp-btn bp-btn-light">ফ্রি শুরু করুন</Link>
        </div>
        <div className="bp-scallop" aria-hidden="true" />
      </div>
    </div>
  );
}
