// Single source of truth for the 6 products.
// Anything you want to render about a Product (overview page, navbar dropdown,
// /products/[slug] detail) pulls from here.

// Product lifecycle status. Affects badge + CTA wording + trust messaging.
export type ProductStatus = 'live' | 'beta' | 'planned'

export interface Product {
  slug: string                  // URL-safe id, used for /products/[slug]
  order: number                 // display order
  emoji: string                 // small icon for cards/nav
  nameBn: string                // Bengali name (primary — Bangladesh-first)
  nameEn: string                // English name (secondary)
  taglineBn: string             // one-liner for cards (Bangla)
  taglineEn: string             // one-liner for cards (English)
  description: string           // 2-3 sentence product pitch (Bangla)
  features: string[]            // bullet list for detail page (Bangla)
  gradient: string              // tailwind gradient classes for hero
  badge: string                 // small status badge (top-right of card)
  status: ProductStatus
  ctaLabel: string              // button text on detail page
  ctaHref: string               // where the CTA goes
  ctaSecondary?: { label: string; href: string }
  // Trust-building fields (added 2026-06-15 from COMPETITIVE_ANALYSIS.md)
  comingSoon: string[]          // features explicitly promised in roadmap
  competitorGap: string         // 1-sentence why-this-product-wins-here
  demoUrl: string | null        // where users can SEE the product working
}

export const PRODUCTS: Product[] = [
  {
    slug: 'ai-video',
    order: 1,
    emoji: '🎬',
    nameBn: 'AI ভিডিও',
    nameEn: 'AI Marketing Videos',
    taglineBn: 'একটা প্রম্পট দিন, ৯০ সেকেন্ডে ভিডিও পান',
    taglineEn: 'One prompt → 90-second finished video',
    description:
      'বাংলায় স্ক্রিপ্ট + ভয়েস + ক্যাপশন — সব অটো। ফ্রিল্যান্স এডিটরের চেয়ে ৭০% সস্তায়। মাসে ১০টা ভিডিও মাত্র ৳২,০০০।',
    features: [
      'বাংলা স্ক্রিপ্ট থেকে ভিডিও পর্যন্ত ফুল-অটো',
      '৪K export, watermark ছাড়া',
      'রিলস/টিকটক/YT Shorts ফরম্যাট প্রি-সেট',
      '১০০+ রেডিমেড বাংলা প্রম্পট টেমপ্লেট',
      'ফেসবুক শপ, ইউটিউব, ওয়েবিনার — সব নিশ',
    ],
    gradient: 'from-purple-600 via-pink-500 to-rose-500',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'ফ্রি ট্রায়াল শুরু করুন',
    ctaHref: '/signup?ref=product-ai-video',
    ctaSecondary: { label: 'প্রম্পট দেখুন', href: '/prompts' },
    comingSoon: [
      'বাংলা প্রম্পট → ইংরেজি অটো-ট্রান্সলেশন (Q3 2026)',
      'বাংলা ভয়েসওভার (gTTS + lip-sync) — Q3 2026',
      'ফেসবুক/ইনস্টা/টিকটক অটো-পোস্ট — Q4 2026',
      '৫০+ রেডিমেড বাংলা ভিডিও টেমপ্লেট — Q3 2026',
    ],
    competitorGap:
      'বাংলাদেশে AI Video প্ল্যাটফর্ম — Runway/Sora ২০$/মাসের বিপরীতে মাত্র ৳১,০০০/মাস (EARLY50 দিয়ে)।',
    demoUrl: '/generate',
  },
  {
    slug: 'cloud-hosting',
    order: 2,
    emoji: '☁️',
    nameBn: 'ক্লাউড হোস্টিং',
    nameEn: 'Cloud Hosting',
    taglineBn: '৫GB ফ্রি, NVMe SSD, ৯৯.৯% আপটাইম',
    taglineEn: 'Managed VPS + Web Hosting, Bangladesh-local',
    description:
      'বাংলাদেশ-লোকেশন ব্যাকএন্ড। cPanel ছাড়া এক-ক্লিক ওয়ার্ডপ্রেস + Node। বাংলা কন্ট্রোল প্যানেল। বিকাশ পেমেন্ট ইন্টিগ্রেশন।',
    features: [
      'বাংলাদেশ CDN (ঢাকা + চট্টগ্রাম PoP)',
      'বিকাশ/নগদ/রকেট পেমেন্ট',
      '৫GB free tier, prepaid ৳৩০০/মাস থেকে',
      'cPanel + Node + Python + Docker',
      'স্বয়ংক্রিয় SSL + DDoS protection',
    ],
    gradient: 'from-blue-600 via-cyan-500 to-teal-400',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'হোস্টিং প্ল্যান দেখুন',
    ctaHref: '/pricing',
    ctaSecondary: { label: 'কন্ট্রোল প্যানেল', href: '/dashboard/services' },
    comingSoon: [
      'বাংলা cPanel (ফাইল ম্যানেজার, ডোমেইন, ডাটাবেজ) — Q4 2026',
      'ওয়ার্ডপ্রেস ওয়ান-ক্লিক ইনস্টল — Q4 2026',
      'bKash/Nagad/Rocket পেমেন্ট ইন্টিগ্রেশন — Q3 2026',
      'ডেইলি অটো-ব্যাকআপ (Cloudflare R2) — Q4 2026',
      'ফ্রি .hostamar.com সাব-ডোমেইন — Q3 2026',
    ],
    competitorGap:
      'ExonHost/HostMight-এর পুরানো cPanel-এর বদলে বাংলা ফার্স্ট-ক্লাস ক্লাউড — Vercel-এর মতো আধুনিক, ExonHost-এর দামে।',
    demoUrl: '/dashboard/services',
  },
  {
    slug: 'ai-chat',
    order: 3,
    emoji: '💬',
    nameBn: 'AI চ্যাট',
    nameEn: 'AI Chat',
    taglineBn: 'বাংলায় কথা বলুন, কাজ করে নিন',
    taglineEn: 'Bangla-first assistant for queries, code, writing',
    description:
      'GPT-4 ক্লাস মডেল, কিন্তু ইন্টারফেস সম্পূর্ণ বাংলায়। কোড লিখুন, ইমেইল ড্রাফট করুন, স্কুল হোমওয়ার্ক সমাধান করুন — সব এক জায়গায়।',
    features: [
      'বাংলা ভয়েস ইনপুট',
      'কোড কম্প্যানিয়ন (Python, JS, TS, Go, Rust)',
      'ইমেইল + কন্টেন্ট টেমপ্লেট',
      'ফাইল আপলোড, PDF রিড',
      'ফ্রি টায়ার ১০০ মেসেজ/দিন',
    ],
    gradient: 'from-green-600 via-emerald-500 to-teal-500',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'চ্যাট শুরু করুন',
    ctaHref: '/ai-chat',
    comingSoon: [
      'বাংলা ভয়েস ইনপুট/আউটপুট (Web Speech + gTTS) — Q3 2026',
      'কোড-স্পেশালিস্ট মডেল (CodeLlama, DeepSeek Coder) — Q3 2026',
      'PDF/ইমেজ আপলোড + Q&A (Retrieval-augmented) — Q4 2026',
      'শেয়ার কনভারসেশন (পাবলিক লিংক) — Q3 2026',
    ],
    competitorGap:
      'ChatGPT Plus ২০$/মাসের বিপরীতে মাত্র ৳১,০০০/মাস — বাংলা ফার্স্ট, বাংলা ভয়েস, bKash পেমেন্ট।',
    demoUrl: '/ai-chat',
  },
  {
    slug: 'ai-browser',
    order: 4,
    emoji: '🌐',
    nameBn: 'AI ব্রাউজার',
    nameEn: 'AI Browser',
    taglineBn: 'ব্রাউজ করুন, AI সারাংশ পান',
    taglineEn: 'Browse — get a Bangla summary + key actions',
    description:
      'ওয়েবপেজ স্ক্র্যাপ করে বাংলায় সারাংশ। লং-ফর্ম আর্টিকেল পড়ার সময় নেই? AI পড়ুক, ১০ লাইনে সারমর্ম দিক।',
    features: [
      'যেকোনো URL পেস্ট → বাংলা সারাংশ',
      'কী-অ্যাকশন এক্সট্র্যাক্ট (ফোন নম্বর, ঠিকানা)',
      'আর্টিকেল তুলনা (২টা URL একসাথে)',
      'PDF + DOCX আপলোড → সারাংশ',
      'ব্রাউজার হিস্ট্রি সংরক্ষণ',
    ],
    gradient: 'from-indigo-600 via-purple-500 to-pink-500',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'ব্রাউজার চেষ্টা করুন',
    ctaHref: '/browser',
    comingSoon: [
      'URL → বাংলা সারাংশ (HF Inference + NLLB-200) — Q4 2026',
      'ফুল-পেজ বাংলা ট্রান্সলেশন — Q4 2026',
      'YouTube ট্রান্সক্রিপ্ট + বাংলা সারাংশ — Q4 2026',
      'PDF আপলোড + বাংলা Q&A (বিশ্ববিদ্যালয় শিক্ষার্থীদের জন্য) — Q4 2026',
      'Chrome Extension (ডান-ক্লিক → বাংলায় সারাংশ) — Q1 2027',
    ],
    competitorGap:
      'Arc Browser / Perplexity-এর বিপরীতে — বাংলা ইন্টারফেস, বাংলা সারাংশ, ইংরেজি আর্টিকেল বাংলায় পড়ার সুযোগ।',
    demoUrl: '/browser',
  },
  {
    slug: 'game',
    order: 5,
    emoji: '🎮',
    nameBn: 'গেম',
    nameEn: 'Gaming Platform',
    taglineBn: 'ব্রাউজারে গেম খেলুন, AI-এ প্রতিদ্বন্দ্বিতা করুন',
    taglineEn: 'Browser games + AI opponents',
    description:
      'ক্লাউড-হোস্টেড HTML5 গেমস। AI অপোনেন্টের সাথে দাবা, গো, লুডো — সারাক্ষণ অনলাইন। টুর্নামেন্টে টাকা জিতুন।',
    features: [
      'দাবা + গো + লুডো (AI-এর বিপক্ষে)',
      '২-প্লেয়ার realtime ম্যাচ',
      'ডেইলি টুর্নামেন্ট (১০০ টাকা পুরস্কার)',
      'PNG avatar + leaderboard',
      'API তৈরির চলছে — গেম ডেভেলপারদের জন্য',
    ],
    gradient: 'from-rose-500 via-orange-400 to-yellow-400',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'খেলা শুরু করুন',
    ctaHref: '/game',
    comingSoon: [
      '১০টি HTML5 গেম (open-source Phaser/Three.js) — Q4 2026',
      'টুর্নামেন্ট সিস্টেম (bracket, prizes, bKash payout) — Q4 2026',
      'bKash/Nagad in-game টপ-আপ — Q4 2026',
      'লিডারবোর্ড (দৈনিক/সাপ্তাহিক/সর্বকালের) — Q4 2026',
      'গেম ডেভেলপার পোর্টাল (Roblox মডেল) — Q1 2027',
    ],
    competitorGap:
      'Steam/Epic/Roblox-এর বিপরীতে — bKash পেমেন্ট, BD-সার্ভার, বাংলা UI, টুর্নামেন্টে ৳৫০-৫০০ এন্ট্রি ফি।',
    demoUrl: '/game',
  },
  {
    slug: 'dev-ide',
    order: 6,
    emoji: '💻',
    nameBn: 'Dev IDE',
    nameEn: 'Code Editor in Browser',
    taglineBn: 'ব্রাউজারে IDE — GitHub, AI inline, deploy',
    taglineEn: 'Cloud IDE with AI autocomplete, sister to AI Chat',
    description:
      'VS Code ক্লাসিক্যাল ফিল, ব্রাউজারে। ফুল GitHub ইন্টিগ্রেশন, AI inline-অটোকমপ্লিট, এক-ক্লিক ডিপ্লয় আমাদের ক্লাউডে।',
    features: [
      'VS Code হটকি + এক্সটেনশন',
      'GitHub, GitLab, Bitbucket ইন্টিগ্রেশন',
      'এক-ক্লিক hostamar.cloud এ ডিপ্লয়',
      'কোড চালানো (Node/Python sandbox)',
      'রিয়েল-টাইম সহযোগিতা (cursor-style)',
    ],
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    badge: 'Beta',
    status: 'beta',
    ctaLabel: 'IDE ওপেন করুন',
    ctaHref: '/dev',
    comingSoon: [
      'Monaco Editor (আসল VS Code) — Q3 2026',
      'Pyodide (Python in browser) — Q3 2026',
      'AI কোড কমপ্লিশন (CodeLlama, DeepSeek Coder) — Q4 2026',
      'এক-ক্লিক hostamar.cloud ডিপ্লয় — Q4 2026',
      'GitHub ইন্টিগ্রেশন (clone/push/PR) — Q4 2026',
      'বাংলা কমেন্ট → AI ইংরেজি কোড জেনারেট — Q1 2027',
    ],
    competitorGap:
      'Cursor/Codespaces ২০$/মাসের বিপরীতে মাত্র ৳১,০০০/মাস — বাংলা UI, BD-ডিপ্লয়, ফ্রি টায়ার।',
    demoUrl: '/dev',
  },
]

export const PRODUCT_BY_SLUG: Record<string, Product> =
  PRODUCTS.reduce((acc, p) => { acc[p.slug] = p; return acc }, {} as Record<string, Product>)

export function getProduct(slug: string): Product | null {
  return PRODUCT_BY_SLUG[slug] || null
}
