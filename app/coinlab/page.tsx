import Link from 'next/link'
import { COINS, BUILD_LAB_LEVELS, COINLAB_INCOME, COINLAB_ROADMAP, COINLAB_LEGAL } from '@/lib/coinlab/coins'

export const metadata = {
  title: 'CoinLab BD — বাংলায় ক্রিপ্টো রিসার্চ, আর্নিং গাইড, কয়েন বানানোর টুল | Hostamar',
  description:
    'Hostamar-এর ১০৭তম সার্ভিস CoinLab BD — প্রতিটি কয়েনের ৭-সেকশন বাংলা রিসার্চ (Basic, Creation, Tokenomics, Technology, Earning, Risk, Build), Top-100 টার্গেট, Build Lab ৩ লেভেল। শিক্ষামূলক — বিনিয়োগ পরামর্শ নয়।',
  keywords: ['CoinLab BD', 'ক্রিপ্টো রিসার্চ বাংলা', 'Hostamar CoinLab', 'crypto research Bangladesh', 'কয়েন কিভাবে বানাবে'],
  openGraph: {
    title: 'CoinLab BD — বাংলা ক্রিপ্টো রিসার্চ হাব',
    description: '৪ পিলার: Research Hub • Earn Lab • Build Lab • Community — Top 100 কয়েন, ৭ সেকশন টেমপ্লেট।',
  },
}

const GREEN = '#0E7C3A'

const PILLARS = [
  { icon: '🔬', title: 'Research Hub', desc: 'প্রতিটি কয়েনের আলাদা প্রোফাইল — বেসিক থেকে টোকেনোমিক্স, ৭ সেকশনে সাজানো' },
  { icon: '💰', title: 'Earn Lab', desc: 'ওই কয়েন থেকে কিভাবে ইনকাম হয় — Staking, Mining, Airdrop, Liquidity, Node running' },
  { icon: '🛠️', title: 'Build Lab', desc: 'এইরকম কয়েন বানাতে চান? No-Code থেকে Pro consultancy — ৩ লেভেলে ধাপে ধাপে' },
  { icon: '👥', title: 'Community', desc: 'ইউজার রিভিউ ও রেটিং (M3-এ আসছে) — রিসার্চ কমিউনিটি একসাথে যাচাই করবে' },
]

const TEMPLATE_SECTIONS = [
  'বেসিক — নাম, সিম্বল, লঞ্চ ডেট, ফাউন্ডার, ওয়েবসাইট',
  'কিভাবে তৈরি — Consensus (PoW/PoS), কোন ব্লকচেইন, ওপেন সোর্স কিনা',
  'টোকেনোমিক্স — Total Supply, Circulating, Inflation, Burn',
  'টেকনোলজি — কী সমস্যা সমাধান করে, Whitepaper সারসংক্ষেপ',
  'আর্নিং সোর্স — Staking/Mining/Trading/Airdrop/Liquidity/Node',
  'রিস্ক — স্ক্যাম-চেক, সেন্ট্রালাইজেশন, অডিট অবস্থা',
  'এইরকম কয়েন কিভাবে বানাবেন — Build Lab বাটন',
]

export default function CoinLabPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      {/* HERO */}
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>HOSTAMAR সার্ভিস #107 — COINLAB BD</div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-2">
            পৃথিবীর সব কয়েনের রিসার্চ এবার <span style={{ color: GREEN }}>বাংলায়</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl">
            ১৫,০০০+ কয়েন আছে দুনিয়ায়, কিন্তু বাংলায় বিশ্বস্ত রিসার্চ প্রায় নেই — স্ক্যাম আর ভুল তথ্যে ভরা।
            CoinLab BD শুরু করছে <b>Top 100</b> কয়েন দিয়ে (একসাথে ১৫,০০০ নয় — গুছিয়ে, যাচাই করে)।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="#coins" className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-5 py-2.5 text-sm font-bold">
              Top 10 রিসার্চ দেখুন →
            </Link>
            <Link href="#build" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              নিজের কয়েন বানাতে চান?
            </Link>
            <Link href="/store" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              সব ১০৭ সার্ভিস — Store
            </Link>
          </div>
        </div>
      </div>

      {/* 4 PILLARS */}
      <h2 className="text-xl font-bold mt-10 mb-4">৪টি পিলার</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map((p) => (
          <div key={p.title} className="rounded-2xl border bg-white p-5">
            <div className="text-2xl">{p.icon}</div>
            <div className="font-bold mt-2">{p.title}</div>
            <p className="text-sm text-zinc-600 mt-1">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* 7-SECTION TEMPLATE */}
      <h2 className="text-xl font-bold mt-10 mb-3">প্রতিটি কয়েনের ৭-সেকশন রিসার্চ টেমপ্লেট</h2>
      <div className="rounded-2xl border bg-[#F8FAFC] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {TEMPLATE_SECTIONS.map((s, i) => (
            <div key={s} className="text-sm flex gap-2">
              <span className="font-bold" style={{ color: GREEN }}>{i + 1}.</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TOP 10 COINS */}
      <h2 id="coins" className="text-xl font-bold mt-10 mb-4">Research Hub — Top 10 (M1 শুরু, Top-100 টার্গেট)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COINS.map((c) => (
          <Link
            key={c.slug}
            href={`/coinlab/coin/${c.slug}`}
            className="rounded-2xl border bg-white p-5 hover:border-[#0E7C3A] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.emoji}</span>
              <div>
                <div className="font-bold">{c.name} <span className="text-zinc-500 font-normal text-xs">{c.symbol}</span></div>
                <div className="text-xs text-zinc-600">{c.creation.consensus}</div>
              </div>
            </div>
            <div className="text-xs text-zinc-600 mt-3 line-clamp-2">{c.technology.problem}</div>
            <div className="text-xs font-bold mt-3" style={{ color: GREEN }}>রিসার্চ দেখুন →</div>
          </Link>
        ))}
      </div>

      {/* EARN LAB */}
      <h2 id="earn" className="text-xl font-bold mt-10 mb-3">Earn Lab — কয়েন থেকে ইনকামের ৬+ পথ</h2>
      <div className="rounded-2xl border bg-white p-5 text-sm text-zinc-700">
        Staking / Restaking • Mining (PoW) • Trading / Futures • Airdrop / Testnet • Liquidity / Yield Farming • Node Running
        <div className="text-xs text-zinc-500 mt-2">প্রতিটি কয়েনের প্রোফাইলে ওই কয়েনে প্রযোজ্য পথগুলো আলাদা করে দেওয়া আছে।</div>
      </div>

      {/* BUILD LAB */}
      <h2 id="build" className="text-xl font-bold mt-10 mb-4">Build Lab — নিজের কয়েন বানানোর ৩ লেভেল</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {BUILD_LAB_LEVELS.map((b) => (
          <div key={b.level} className="rounded-2xl border bg-white p-5">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">LEVEL {b.level}</div>
            <div className="font-bold mt-1">{b.title}</div>
            <div className="text-xs font-bold mt-1" style={{ color: GREEN }}>{b.price}</div>
            <ul className="mt-3 space-y-2">
              {b.points.map((p) => (
                <li key={p} className="text-sm text-zinc-600 flex gap-2"><span style={{ color: GREEN }}>▸</span>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* INCOME + ROADMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-10">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs font-semibold tracking-widest text-zinc-500">COINLAB-এর ইনকাম সোর্স</div>
          <ul className="mt-3 space-y-2">
            {COINLAB_INCOME.map((i) => (
              <li key={i} className="text-sm text-zinc-700 flex gap-2"><span style={{ color: GREEN }}>▸</span>{i}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs font-semibold tracking-widest text-zinc-500">রোডম্যাপ</div>
          <div className="mt-3 space-y-3">
            {COINLAB_ROADMAP.map((r) => (
              <div key={r.phase} className="flex gap-3">
                <span className="inline-flex rounded-full bg-[#F8FAFC] border px-3 py-1 text-xs font-bold" style={{ color: GREEN }}>{r.phase}</span>
                <span className="text-sm text-zinc-700">{r.what}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TECH */}
      <div className="rounded-2xl bg-[#F8FAFC] border p-5 mt-10">
        <div className="text-xs font-semibold tracking-widest">টেক স্ট্যাক (Hostamar-এর সাথে একই বিল্ড-প্যাটার্ন)</div>
        <p className="text-sm text-zinc-700 mt-2">
          Next.js + Tailwind (এই সাইটই), Prisma/Postgres-এ ৩টি টেবিল টার্গেট — <span className="font-mono text-xs">coins, earning_methods, creation_guides</span>।
          M2-তে CoinGecko Free API (10 calls/day) + CoinMarketCap + DefiLlama থেকে প্রাইস/মার্কেট-ক্যাপ/লোগো অটো।
          M1-এ নিচের Top 10-টি যাচাই করা তথ্য দিয়ে শুরু — কোনো না-যাচাই সংখ্যা নেই।
        </p>
      </div>

      {/* LEGAL */}
      <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-5 mt-6">
        <p className="text-sm text-red-800">{COINLAB_LEGAL}</p>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full border bg-white px-5 py-2.5 text-sm">← Home</Link>
        <Link href="/store" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">Store →</Link>
      </div>
    </div>
  )
}
