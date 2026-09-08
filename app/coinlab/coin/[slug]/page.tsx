import Link from 'next/link'
import { notFound } from 'next/navigation'
import { COINS, BUILD_LAB_LEVELS, COINLAB_LEGAL } from '@/lib/coinlab/coins'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return COINS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const coin = COINS.find((c) => c.slug === params.slug)
  if (!coin) return {}
  return {
    title: `${coin.name} (${coin.symbol}) — বাংলা রিসার্চ | CoinLab BD`,
    description: `${coin.name} কিভাবে তৈরি, টোকেনোমিক্স, টেকনোলজি, আর্নিং সোর্স ও রিস্ক — CoinLab BD ৭-সেকশন বাংলা রিসার্চ। শিক্ষামূলক, বিনিয়োগ পরামর্শ নয়।`,
  }
}

const GREEN = '#0E7C3A'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold" style={{ background: GREEN }}>{n}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b last:border-0">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide pt-1">{k}</div>
      <div className="sm:col-span-2 text-sm text-zinc-800">{v}</div>
    </div>
  )
}

export default function CoinProfilePage({ params }: { params: { slug: string } }) {
  const coin = COINS.find((c) => c.slug === params.slug)
  if (!coin) notFound()
  const others = COINS.filter((c) => c.slug !== coin.slug).slice(0, 6)

  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{coin.emoji}</span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{coin.name} <span className="text-zinc-400 text-xl">{coin.symbol}</span></h1>
          <div className="text-xs text-zinc-500 mt-0.5">CoinLab BD — Hostamar সার্ভিস #107 — ৭-সেকশন রিসার্চ</div>
        </div>
      </div>

      <Section n={1} title="বেসিক">
        <div className="rounded-2xl border bg-white p-5">
          <Row k="নাম / সিম্বল" v={`${coin.name} (${coin.symbol})`} />
          <Row k="লঞ্চ ডেট" v={coin.basic.launched} />
          <Row k="ফাউন্ডার" v={coin.basic.founder} />
          <Row k="ওয়েবসাইট" v={coin.basic.website} />
        </div>
      </Section>

      <Section n={2} title="কিভাবে তৈরি">
        <div className="rounded-2xl border bg-white p-5">
          <Row k="Consensus" v={coin.creation.consensus} />
          <Row k="ব্লকচেইন" v={coin.creation.blockchain} />
          <Row k="ওপেন সোর্স" v={coin.creation.openSource ? 'হ্যাঁ — কোড পাবলিক' : 'না'} />
          <Row k="নোট" v={coin.creation.note} />
        </div>
      </Section>

      <Section n={3} title="টোকেনোমিক্স">
        <div className="rounded-2xl border bg-white p-5">
          <Row k="Total Supply" v={coin.tokenomics.supply} />
          <Row k="Inflation" v={coin.tokenomics.inflation} />
          <Row k="Burn" v={coin.tokenomics.burn} />
        </div>
      </Section>

      <Section n={4} title="টেকনোলজি">
        <div className="rounded-2xl border bg-white p-5">
          <Row k="কী সমস্যা সমাধান করে" v={coin.technology.problem} />
          <Row k="সারসংক্ষেপ" v={coin.technology.summary} />
        </div>
      </Section>

      <Section n={5} title="আর্নিং সোর্স (Earn Lab)">
        <div className="rounded-2xl border bg-white p-5">
          <ul className="space-y-2">
            {coin.earning.map((e) => (
              <li key={e} className="text-sm text-zinc-800 flex gap-2"><span style={{ color: GREEN }}>▸</span>{e}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section n={6} title="রিস্ক">
        <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-5">
          <p className="text-sm text-red-800">{coin.risk}</p>
        </div>
      </Section>

      <Section n={7} title="এইরকম কয়েন কিভাবে বানাবেন (Build Lab)">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {BUILD_LAB_LEVELS.map((b) => (
            <div key={b.level} className="rounded-2xl border bg-white p-5">
              <div className="text-xs font-semibold tracking-widest text-zinc-500">LEVEL {b.level}</div>
              <div className="font-bold mt-1 text-sm">{b.title}</div>
              <div className="text-xs font-bold mt-1" style={{ color: GREEN }}>{b.price}</div>
              <p className="text-xs text-zinc-600 mt-2">{b.points[0]}</p>
            </div>
          ))}
        </div>
        <Link href="/coinlab#build" className="inline-flex mt-3 rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-5 py-2.5 text-sm font-bold">
          Build Lab বিস্তারিত →
        </Link>
      </Section>

      <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-5 mt-8">
        <p className="text-sm text-red-800">{COINLAB_LEGAL}</p>
      </div>

      <h2 className="text-lg font-bold mt-10">আরও রিসার্চ</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
        {others.map((c) => (
          <Link key={c.slug} href={`/coinlab/coin/${c.slug}`} className="rounded-xl border bg-white p-3 text-center hover:border-[#0E7C3A]">
            <div className="text-xl">{c.emoji}</div>
            <div className="text-xs font-bold mt-1">{c.symbol}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/coinlab" className="rounded-full border bg-white px-5 py-2.5 text-sm">← CoinLab BD</Link>
        <Link href="/store" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">Store →</Link>
      </div>
    </div>
  )
}
