import Link from 'next/link'
import StoreCatalog from '@/components/store/StoreCatalog'

export const metadata = {
  title: 'Store — Hostamar-এর সব ১০৬+ সার্ভিস | 1cr=1TK',
  description:
    'Hostamar Store — সব AI সার্ভিস এক জায়গায়: 106 ক্যাটালগ সার্ভিস (লাইভ) + CoinLab BD ক্রিপ্টো রিসার্চ হাব (#107)। সাইনআপে 6000 ক্রেডিট ফ্রি, 1 ক্রেডিট = 1 টাকা।',
  keywords: ['Hostamar store', 'AI services Bangladesh', '১০৬ সার্ভিস', 'AI service price Bangladesh'],
  openGraph: {
    title: 'Hostamar Store — 106+ AI সার্ভিস, 1cr=1TK',
    description: 'সব সার্ভিস পাবলিক — দেখুন, তুলনা করুন, সাইনআপ করে অর্ডার করুন।',
  },
}

const GREEN = '#0E7C3A'

export default function StorePage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>HOSTAMAR STORE — পাবলিক</div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-2">
            সব সার্ভিস <span style={{ color: GREEN }}>এক জায়গায়</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl">
            106টি AI সার্ভিস (লাইভ ক্যাটালগ) + CoinLab BD রিসার্চ হাব। সাইনআপ করলেই 6000 ক্রেডিট ফ্রি —
            1 ক্রেডিট = 1 টাকা। সার্ভিস কার্ডে মূল্য দেখে ড্যাশবোর্ড থেকে সরাসরি অর্ডার করুন।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-5 py-2.5 text-sm font-bold">
              ফ্রি সাইনআপ — 6000cr
            </Link>
            <Link href="/pricing" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              প্যাকেজ দেখুন
            </Link>
            <Link href="/docs" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              সম্পূর্ণ ডকস
            </Link>
          </div>
        </div>
      </div>

      {/* CoinLab feature banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Link href="/coinlab" className="rounded-2xl border-2 bg-white p-5 hover:border-[#0E7C3A] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold rounded-full bg-[#F8FAFC] border px-3 py-1" style={{ color: GREEN }}>নতুন — সার্ভিস #107</span>
            <span className="text-xs font-bold rounded-full bg-[#0E7C3A] text-white px-3 py-1">ফ্রি রিসার্চ</span>
          </div>
          <div className="font-bold mt-2">CoinLab BD — বাংলায় ক্রিপ্টো রিসার্চ</div>
          <p className="text-sm text-zinc-600 mt-1">
            ৪ পিলার (Research Hub • Earn Lab • Build Lab • Community), ৭-সেকশন টেমপ্লেট, Top-100 টার্গেট, নিজের কয়েন বানানোর Build Lab।
          </p>
        </Link>
        <div className="rounded-2xl border bg-[#F8FAFC] p-5">
          <div className="text-xs font-semibold tracking-widest text-zinc-500">কিভাবে কাজ করে</div>
          <ol className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>1. সাইনআপ — 6000 ক্রেডিট ফ্রি (1cr = 1TK)</li>
            <li>2. সার্ভিস বাছুন — নিচের কার্ডে দাম ক্রেডিটে দেখানো</li>
            <li>3. ড্যাশবোর্ড → সার্ভিস → অর্ডার → ডেলিভারি ড্যাশবোর্ডে</li>
          </ol>
        </div>
      </div>

      {/* Live catalog grid (client component, public API) */}
      <StoreCatalog />

      {/* ৬ প্রোডাক্ট — প্রতিটির বিস্তারিত বাংলা ব্যাখ্যা */}
      <div className="mt-12">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>৬টি ফ্ল্যাগশিপ প্রোডাক্ট — বিস্তারিত</div>
        <h2 className="text-2xl font-bold mt-2">প্রতিটি প্রোডাক্ট কী করে, কেন দরকার, কীভাবে ব্যবহার করবে</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">১. Hostamar Cloud Hosting — বাংলা হোস্টিং</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> NVMe SSD + LiteSpeed সার্ভার + cPanel — বাংলাদেশের ব্যবসার জন্য টিউন করা হোস্টিং।
              <br /><b>কেন দরকার:</b> বিদেশি হোস্টিংয়ে বাংলা সাপোর্ট নেই, পেমেন্ট জটিল — এখানে bKash-এ পেমেন্ট, বাংলায় সাপোর্ট।
              <br /><b>কীভাবে:</b> অর্ডার → bKash পেমেন্ট ভেরিফাই → অ্যাকাউন্ট অটো-প্রোভিশন (কয়েক মিনিট) → cPanel লিংক ইমেইল।
            </p>
            <Link href="/hosting" className="inline-flex mt-3 text-sm font-semibold" style={{ color: GREEN }}>হোস্টিং পেজ →</Link>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">২. Hosta AI Support Agent — বাংলা AI সাপোর্ট</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> তোমার সাইটে ২৪/৭ বাংলা AI চ্যাট এজেন্ট — সার্ভার স্ট্যাটাস চেক, ইনভয়েস, রিসেট রিকোয়েস্ট নিজেই সামলায়।
              <br /><b>কেন দরকার:</b> রাত ৩টার টিকিটে ঘুম নষ্ট হয় না — Hosta উত্তর দেয়, দরকার হলে তোমাকে জানায়।
              <br /><b>কীভাবে:</b> এজেন্ট ইনস্টল → তোমার ডকস/FAQ শেখাও → সাইটে উইজেট বসাও। নিচের চ্যাট বাটনটাই এর লাইভ ডেমো।
            </p>
            <Link href="/chat" className="inline-flex mt-3 text-sm font-semibold" style={{ color: GREEN }}>AI চ্যাট ডেমো →</Link>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">৩. AI Video Factory (HunyuanVideo) — AI ভিডিও বানানো</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> টেক্সট লিখলেই বিজ্ঞাপন/শোকেস ভিডিও বানায় — আমাদের GPU ফ্যাক্টরিতে রেন্ডার।
              <br /><b>কেন দরকার:</b> ভিডিও এজেন্সির ভাড়া ৫০০০-২০০০০TK — এখানে ক্রেডিটে, মিনিটে।
              <br /><b>কীভাবে:</b> অর্ডারে স্ক্রিপ্ট/আইডিয়া দাও → রেন্ডার হয় → ড্যাশবোর্ডে ডাউনলোড।
            </p>
            <Link href="/video" className="inline-flex mt-3 text-sm font-semibold" style={{ color: GREEN }}>AI ভিডিও →</Link>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">৪. AI TV Daily Loop — AI টিভি</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> প্রতিদিন AI-তৈরি সংবাদ/শিক্ষা ভিডিও লুপ করে চলে — tv.hostamar.com লাইভ চ্যানেল।
              <br /><b>কেন দরকার:</b> YouTube চ্যানেলের কনটেন্ট ফ্যাক্টরি — প্রতিদিন নতুন ভিডিও, কপিরাইট-নিরাপদ (নিজস্ব স্ক্রিপ্ট+ভিজ্যুয়াল)।
              <br /><b>কীভাবে:</b> এখনই দেখো — নিচের লাইভ লিংকে ২৪/৭ চলছে।
            </p>
            <Link href="/tv" className="inline-flex mt-3 text-sm font-semibold" style={{ color: GREEN }}>লাইভ TV দেখো →</Link>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">৫. AI Store — ১০৭ সার্ভিস</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> এই পেজটাই — ১০৬ লাইভ ক্যাটালগ সার্ভিস + CoinLab = ১০৭। প্রতিটি কার্ড বাংলায়, "আরো জানো"তে বিস্তারিত।
              <br /><b>কেন দরকার:</b> Fiverr-এ $10-50 এর কাজ এখানে 1cr=1TK — বাংলা ব্যাখ্যাসহ।
              <br /><b>কীভাবে:</b> উপরে সার্চ/ক্যাটাগরি → কার্ড → সাইনআপ → অর্ডার।
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-bold">৬. CoinLab — কয়েন ল্যাব (BTC মনিটর)</div>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              <b>কী করে:</b> বাংলায় ক্রিপ্টো রিসার্চ — ৭-সেকশন টেমপ্লেট, BTC Up/Down মনিটর, স্ক্যাম-থেকে-বাঁচারো গাইড।
              <br /><b>কেন দরকার:</b> বাংলাদেশে ক্রিপ্টো স্ক্যাম প্রবল — যাচাই-করা তথ্য ছাড়া টাকা ডোবার ঝুঁকি। CoinLab ঝুঁকি-ফ্ল্যাগসহ ডেটা দেয়।
              <br /><b>কীভাবে:</b> পেপার ট্রেডিং অনলি (কোনো প্রাইভেট কী নয়) — শেখার জায়গা।
            </p>
            <Link href="/coinlab" className="inline-flex mt-3 text-sm font-semibold" style={{ color: GREEN }}>CoinLab →</Link>
          </div>
        </div>
      </div>

      {/* FAQ — বাংলা */}
      <div className="mt-12 rounded-2xl border bg-[#F8FAFC] p-6">
        <div className="text-xs font-semibold tracking-widest text-zinc-500">সাধারণ প্রশ্ন</div>
        <h3 className="text-lg font-bold mt-2">FAQ — যা সবাই জিজ্ঞেস করে</h3>
        <div className="mt-4 space-y-3 text-sm text-zinc-700">
          <details className="rounded-xl bg-white border p-4"><summary className="font-semibold cursor-pointer">ক্রেডিট কীভাবে কাজ করে?</summary><p className="mt-2">1 ক্রেডিট = 1 টাকা। সাইনআপে ৬০০০ ক্রেডিট ফ্রি — মানে ৬০০০ টাকার সার্ভিস ফ্রিতে ট্রাই করো। শেষ হলে প্যাকেজ কিনলে বা bKash-এ টপ-আপ করলে।</p></details>
          <details className="rounded-xl bg-white border p-4"><summary className="font-semibold cursor-pointer">Fiverr-এর চেয়ে সস্তা কেন?</summary><p className="mt-2">আমাদের AI নিজস্ব GPU-তে চলে — মাঝখানে ফ্রিল্যান্সার-মার্কআপ নেই। তাই $10-50 কাজ ১৫-১০০ টাকায়।</p></details>
          <details className="rounded-xl bg-white border p-4"><summary className="font-semibold cursor-pointer">পেমেন্ট কীভাবে?</summary><p className="mt-2">bKash (01822417463), Nagad, Rocket — সবই বাংলাদেশি পেমেন্ট, কার্ড লাগে না।</p></details>
          <details className="rounded-xl bg-white border p-4"><summary className="font-semibold cursor-pointer">ডেটা কি নিরাপদ?</summary><p className="mt-2">হোস্টিং কাস্টমারদের ডেটা ব্যাকআপসহ (B2 off-site)। AI চ্যাটে কোনো প্রাইভেট কী/পাসওয়ার্ড দিও না — Hosta কখনো চায় না।</p></details>
          <details className="rounded-xl bg-white border p-4"><summary className="font-semibold cursor-pointer">সার্ভিস খারাপ হলে?</summary><p className="mt-2">৭ দিনের মানি-ব্যাক গ্যারান্টি — ড্যাশবোর্ড থেকে রিফান্ড রিকোয়েস্ট, bKash-এ ফেরত।</p></details>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full border bg-white px-5 py-2.5 text-sm">← Home</Link>
        <Link href="/pricing" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">প্যাকেজ →</Link>
      </div>
    </div>
  )
}
