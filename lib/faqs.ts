// Single source of truth for Hostamar FAQs.
// Consumed by app/faq/page.tsx (all 25), app/page.tsx (featured 6 + homepage JSON-LD),
// and the /faq FAQPage structured data. Edit here → every surface + SERP updates.

export type FaqCat =
  | 'billing'
  | 'video'
  | 'hosting'
  | 'chat'
  | 'gaming'
  | 'account'

export type Faq = {
  id: string
  cat: FaqCat
  q: string
  a: string
  link?: { href: string; label: string }
}

export const FAQS: Faq[] = [
  // Billing
  {
    id: 'billing-active',
    cat: 'billing',
    q: 'টাকা কেটেছে কিন্তু একাউন্ট একটিভ হয়নি?',
    a: 'Send Money করার পর TrxID আমাদের পাঠান — ম্যানুয়ালি যাচাই করে একাউন্ট একটিভ করে দিই, সাধারণত ২ ঘণ্টার মধ্যে। জরুরি হলে TrxID সহ মেসেজ করুন।',
    link: { href: '/contact', label: 'যোগাযোগ করুন' },
  },
  {
    id: 'billing-invoice',
    cat: 'billing',
    q: 'ইনভয়েস / রশিদ পাবো?',
    a: 'হ্যাঁ, প্রতিটি পেমেন্টের পর ড্যাশবোর্ডে ইনভয়েস + bKash রশিদ পাবেন।',
  },
  {
    id: 'billing-refund',
    cat: 'billing',
    q: '৭ দিন মানি ব্যাক পাবো?',
    a: 'হ্যাঁ, যেকোনো পেইড প্ল্যানে ৭ দিনের মানি-ব্যাক গ্যারান্টি। কারণ ছাড়াই bKash নাম্বারে ২৪ ঘণ্টায় রিফান্ড।',
    link: { href: '/pricing', label: 'প্ল্যান দেখুন' },
  },
  {
    id: 'billing-methods',
    cat: 'billing',
    q: 'bKash ছাড়া কার্ড/ব্যাংক দিয়ে দেওয়া যায়?',
    a: 'এখন bKash / Nagad / Rocket Send Money চলে। কার্ড ও ব্যাংক ট্রান্সফার পরে আসছে — চাইলে আমাদের জানান, আপনার জন্য আগে যোগ করবো।',
  },
  {
    id: 'billing-upgrade',
    cat: 'billing',
    q: 'মাঝে প্ল্যান আপগ্রেড করলে টাকা নষ্ট?',
    a: 'না — আপগ্রেড করলে শুধু প্রোরাটা (অবশিষ্ট দিন) হিসাবে অল্প টাকা কাটবে, পুরো টাকা নয়।',
  },

  // Video
  {
    id: 'video-watermark',
    cat: 'video',
    q: 'ফ্রি প্ল্যানে ওয়াটারমার্ক থাকে?',
    a: 'হ্যাঁ, ফ্রিতে ছোট "Made with Hostamar" ওয়াটারমার্ক থাকে। Starter (৳৫৯৯/মাস) থেকে ক্লিন ১০৮০p, কোনো ওয়াটারমার্ক নয়।',
    link: { href: '/pricing', label: 'স্টার্টার প্ল্যান' },
  },
  {
    id: 'video-yo-phola',
    cat: 'video',
    q: 'বাংলা য-ফলা ভাঙে?',
    a: 'না — আমাদের Perfect Bangla Font য-ফলা, উ-কার, নাকি সহ সঠিক রেন্ডার করে। পুরানো ভাঙা রেন্ডার vs নতুন ফিক্স ফিচার পেজে দেখুন।',
    link: { href: '/features', label: 'ফিচার দেখুন' },
  },
  {
    id: 'video-voice',
    cat: 'video',
    q: 'ভয়েসওভার কত ভাষা সাপোর্ট করে?',
    a: 'মূলত বাংলা (পুরুষ/মহিলা — সুমাইয়া), ইংরেজি, হিন্দি। বাংলা আমাদের সবচেয়ে ন্যাচারাল, ElevenLabs + OpenAI মডেল।',
  },
  {
    id: 'video-4k',
    cat: 'video',
    q: '৪K export পাবো?',
    a: 'হ্যাঁ, Business ও Enterprise প্ল্যানে ৪K (2160p) export। Starter-এ 1080p, ফ্রিতে 720p।',
  },
  {
    id: 'video-hook',
    cat: 'video',
    q: 'Hook Generator কী?',
    a: 'আপনার নিচের টপিক দিয়ে স্ক্রল-স্টপিং হুক বানায় — যেমন "ঈদে সবাই তাকিয়ে থাকবে"। রমজান/পূজা/সেল সব টেমপ্লেট আছে।',
  },

  // Hosting
  {
    id: 'hosting-diff',
    cat: 'hosting',
    q: 'HostSeba / ExonHost থেকে আমাদের পার্থক্য?',
    a: 'ওরা শুধু হোস্টিং দেয়, আমরা AI ভিডিও + হোস্টিং একসাথে Starter ৳৫৯৯/মাসে। প্ল্যান কিনলে হোস্টিং ফ্রি পান, ভিডিও তৈরিও করতে পারেন।',
    link: { href: '/hosting', label: 'হোস্টিং দেখুন' },
  },
  {
    id: 'hosting-cpanel',
    cat: 'hosting',
    q: 'cPanel আছে?',
    a: 'হ্যাঁ, বাংলা cPanel — ফাইল, ডেটাবেস, ইমেইল সব বাংলায়। ইংরেজি না বুঝলেও চলবে।',
  },
  {
    id: 'hosting-bdix',
    cat: 'hosting',
    q: 'BDIX স্পিড কত?',
    a: 'বাংলাদেশে BDIX ২০ms লেটেন্সি, NVMe SSD। BD ভিজিটরের জন্য সবচেয়ে ফাস্ট লোড।',
  },
  {
    id: 'hosting-ssl',
    cat: 'hosting',
    q: 'ফ্রি SSL পাবো?',
    a: 'হ্যাঁ, Let’s Encrypt ফ্রি SSL অটো-ইনস্টল। কোনো চার্জ নেই।',
  },
  {
    id: 'hosting-migrate',
    cat: 'hosting',
    q: 'অন্য থেকে মাইগ্রেশন করে দেবেন?',
    a: 'হ্যাঁ, ফ্রি মাইগ্রেশন — আপনার পুরানো সাইট আমরা হোস্ট করে দেই। শুধু cPanel অ্যাক্সেস দিন।',
    link: { href: '/contact', label: 'মাইগ্রেশন চান' },
  },

  // Chat / Browser / Dev
  {
    id: 'browser-private',
    cat: 'chat',
    q: 'Browser history কি প্রাইভেট?',
    a: 'হ্যাঁ, ব্রাউজারের ইতিহাস আমাদের প্রাইভেট Ollama মডেলে থাকে, কোথাও শেয়ার হয় না। আপনি মুছে দিতে পারেন।',
    link: { href: '/browser', label: 'ব্রাউজার' },
  },
  {
    id: 'dev-pandas',
    cat: 'chat',
    q: 'IDE তে pandas / Python চলবে?',
    a: 'হ্যাঁ, ব্রাউজারেই Pyodide Python — pandas, numpy চলে। উদা: `pd.read_csv("sales.csv").head()`। ইনস্টল লাগে না।',
    link: { href: '/ide', label: 'IDE' },
  },
  {
    id: 'chat-pdf',
    cat: 'chat',
    q: 'Chat কি PDF বুঝে?',
    a: 'হ্যাঁ, PDF আপলোড করুন, বাংলায় প্রশ্ন করুন — সামারি, কিওয়াই পয়েন্ট, অনুবাদ সব পাবেন।',
  },
  {
    id: 'browser-yt',
    cat: 'chat',
    q: 'YouTube ভিডিও থেকে সামারি কীভাবে?',
    a: 'লিংক পেস্ট করুন, ট্রান্সক্রিপ্ট এক্সট্র্যাক্ট + বাংলা সামারি পাবেন ১০ সেকেন্ডে।',
    link: { href: '/browser', label: 'গাইড' },
  },
  {
    // ORACLE V66 2026-09-14 20:50 — rides HN #1 story (RubyGems rogue agents, 90pts) + same-day "trust dial" launches (Prmptree 49697407, Vigilator 49695678)
    id: 'agent-trust-dial',
    cat: 'chat',
    q: 'AI agent আনঅ্যাটেনডেড চালালে নিরাপদ?',
    a: 'আমাদের ১৬ এজেন্ট "trust dial" মডেলে চলে — কোন টুল নিজে থেকে চলবে, কোনটিতে অনুমোদন লাগবে, তা ঠিক করা থাকে; প্রতিটি রানের রিপোর্ট Fleet ট্যাবে অডিট ট্রেইল হিসেবে জমা হয়। সম্প্রতি RubyGems-এ rogue AI agent অ্যাটাকের পর graduated approval-ই এই খাতের নতুন মান হয়ে যাচ্ছে।',
    link: { href: '/contact', label: 'এজেন্ট হোস্টিং জানুন' },
  },

  // Gaming
  {
    id: 'gaming-payout',
    cat: 'gaming',
    q: 'bKash payout কি ইনস্ট্যান্ট?',
    a: 'হ্যাঁ, ৯০% payout ৫ মিনিটে bKash এ যায়। ৳৫০ হলেই উইথড্র, কোনো হোল্ড নেই, শুক্রবারেও পাবেন।',
  },
  {
    id: 'gaming-cheat',
    cat: 'gaming',
    q: 'টুর্নামেন্টে চিটিং হলে কী হয়?',
    a: 'Anti-cheat + ম্যানুয়াল রিভিউ। প্রমাণ পেলে ব্যান + প্রাইজ মানি ভিকটিমকে ব্যাক। ফেয়ার প্লে আমাদের USP।',
  },
  {
    id: 'gaming-ping',
    cat: 'gaming',
    q: 'BD পিং কত?',
    a: 'ঢাকা সার্ভারে ১৫ms লো পিং। ডাউনলোড ছাড়াই HTML5 গেম, লিংকে খুললেই খেলা।',
  },

  // Account
  {
    id: 'acc-delete',
    cat: 'account',
    q: 'একাউন্ট ডিলিট করবো?',
    a: 'সেটিংস → একাউন্ট থেকে ডিলিট করতে পারেন। ৭ দিনের মধ্যে ফেরত আনা যায়। ডেটা পার্মানেন্ট মুছে যায়।',
  },
  {
    id: 'acc-pass',
    cat: 'account',
    q: 'পাসওয়ার্ড ভুলে গেছি?',
    a: 'লগইনে "Forgot password" → ইমেইলে লিংক → নতুন পাসওয়ার্ড। bKash নাম্বার দিয়েও রিসেট করা যায়।',
    link: { href: '/login', label: 'লগইন' },
  },
  {
    id: 'acc-devices',
    cat: 'account',
    q: 'একাধিক ডিভাইসে লগইন থাকবে?',
    a: 'হ্যাঁ, ফোন + ল্যাপটপ দুটোতেই চলবে। সাসপিশাস লগইনে OTP যাবে।',
  },
]

// Category pills for the /faq page filter (order = display order).
export const FAQ_CATS: { key: 'all' | FaqCat; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'billing', label: 'বিলিং ও bKash' },
  { key: 'video', label: 'ভিডিও' },
  { key: 'hosting', label: 'হোস্টিং' },
  { key: 'chat', label: 'চ্যাট • ব্রাউজার • Dev' },
  { key: 'gaming', label: 'গেমিং' },
  { key: 'account', label: 'একাউন্ট' },
]

// First N featured FAQs for the homepage accordion.
export const FEATURED_FAQS = (n = 6): Faq[] => FAQS.slice(0, n)
