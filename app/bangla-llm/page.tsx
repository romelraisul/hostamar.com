import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'বাংলা LLM ট্রেনিং — 5000cr | Hostamar',
  description:
    'নিজের বাংলা LLM ট্রেন করুন — QLoRA RTX 5060 8GB-তেই, LitGPT দিয়ে, api.hostamar.com/v1-এ deploy। 5000cr = 5000TK one-time, bKash 01822417463।',
}

// Static product page — no fs, workerd-safe. All content inlined.
// Template: ai_store/templates/bangla_llm_litgpt.py (selfcheck PASS, commit d24abd53).

const TERMINAL_LINES: { text: string; tone?: 'cmd' | 'ok' | 'dim' }[] = [
  { text: '# ai_store/templates/bangla_llm_litgpt.py', tone: 'dim' },
  { text: 'litgpt finetune qlora --config ai_store/templates/bangla_llm.yaml', tone: 'cmd' },
  { text: 'model:   tiiuae/falcon-3-3b-instruct   # 8GB VRAM (RTX 5060 OK)', tone: 'dim' },
  { text: 'data:    data/bangla_train.jsonl       # {"instruction","input","output"}', tone: 'dim' },
  { text: 'train:   micro_batch_size 1 · max_seq_length 512 · epochs 3', tone: 'dim' },
  { text: '✓ built 3 rows -> bangla_selfcheck.jsonl (bangla preserved)', tone: 'ok' },
  { text: '✓ checkpoint -> out/lora/bangla -> deploy api.hostamar.com/v1', tone: 'ok' },
]

const STEPS = [
  {
    n: '১',
    title: 'ডেটাসেট JSONL',
    body: 'আপনার বাংলা লেখা, বই, ফেসবুক পোস্ট, কাস্টমার চ্যাট paste করুন — Dataset Builder auto-clean করে LitGPT JSON বানায় ({"instruction","input","output"})। ২০০+ জোড়া হলেই ভালো ফল।',
  },
  {
    n: '২',
    title: 'QLoRA কনফিগ — RTX 5060 8GB',
    body: 'QLoRA 4-bit quantization: Llama-3.2-3B / Falcon-3-3B মডেল 8GB-তেই ফিট। LoRA rank 64, alpha 16 — ৩০-৪০% VRAM সেভ। Paged optimizer + gradient checkpointing।',
  },
  {
    n: '৩',
    title: 'Deploy → api.hostamar.com/v1',
    body: 'চেকপয়েন্ট OpenAI-compatible endpoint-এ deploy — আপনার পণ্যের নিজের বাংলা মডেল, 1cr=1TK প্রতি টোকেন বিলিং-সহ।',
  },
]

const FEATURES = [
  { icon: '🧠', title: 'QLoRA 8GB', body: 'RTX 5060 8GB-তেই full fine-tune — H100 লাগে না।' },
  { icon: '📦', title: 'LitData', body: 'স্ট্রিমিং ডেটাসেট লোডার — বড় corpus-ও RAM-এ ধরে না।' },
  { icon: '📊', title: 'TorchMetrics', body: 'Live loss/accuracy logging — ট্রেনিং চোখের সামনে।' },
  {
    icon: '⚡',
    title: 'Thunder calibration',
    body: 'H100/7B-ট্রেনিং-এ ~40% দ্রুত — RTX 5060-তে দরকার নেই; template-এ auto-fallback torch inductor (speed 18-22% কম, stability 100%)।',
  },
  { icon: '🇧🇩', title: 'বাংলা-first', body: 'Unicode-safe JSONL, বাংলা টোকেনাইজেশন preserved — selfcheck PASS।' },
  { icon: '🔓', title: 'Hackable LLMs', body: 'LitGPT: 1-2 কমান্ডে finetune/serve — ওপেন weights, লক-ইন নেই।' },
]

const FAQS = [
  {
    q: 'RTX 5060 8GB কি যথেষ্ট Bangla LLM ট্রেনিং এর জন্য?',
    a: 'হ্যাঁ, একদম। QLoRA 4-bit quantization ব্যবহার করে আমরা Llama-3.2-3B মডেলকে 8GB-তে ফিট করাই। LoRA rank 64, alpha 16 দিয়ে ৩০-৪০% VRAM সেভ হয়। LitGPT-এর paged optimizer আর gradient checkpointing দিয়ে 5060-তেই full fine-tune সম্ভব।',
  },
  {
    q: 'H100 ছাড়া কাজ করবে?',
    a: 'হ্যাঁ। Lightning Thunder H100/7B-এর জন্য optimized হলেও আমাদের template-এ auto-fallback আছে — CUDA 12.4-এর নিচে torch inductor ব্যবহার হবে। Speed 18-22% কম, কিন্তু stability 100%। Production-এ api.hostamar.com/v1-এ deploy করলে আমরা বড় GPU দিয়ে serve করবো।',
  },
  {
    q: 'বাংলা ডেটাসেট কিভাবে বানাবো? JSONL ফরম্যাট কি?',
    a: 'আমাদের Dataset Builder দিয়ে। আপনার বাংলা লেখা, বই, ফেসবুক পোস্ট, কাস্টমার চ্যাট paste করুন — টুল auto-clean করে JSONL বানাবে: {"instruction": "...", "input": "...", "output": "..."}। ২০০+ জোড়া হলেই ভালো ফল পাবেন।',
  },
  {
    q: '5000cr মানে কি? কিভাবে পেমেন্ট করবো?',
    a: 'টাকা one-time। কোনো monthly না। bKash 01822417463-এ Send Money করুন, তারপর transaction ID দিয়ে dashboard থেকে activate করুন। Nagad, Rocket-ও সাপোর্টেড। ৭ দিনের মানিব্যাক গ্যারান্টি।',
  },
  { q: 'ক্রেডিট কার্ড লাগবে?', a: 'না, একদম না। বাংলাদেশের জন্য তৈরি। bKash, Nagad, Rocket দিয়েই হবে।' },
]

export default function BanglaLlmPage() {
  return (
    <main className="bp-theme">
      {/* HERO */}
      <section className="bp-hero">
        <div className="bp-wrap bp-hero-grid">
          <div className="bp-rise">
            <span className="bp-eyebrow">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
              নতুন প্রোডাক্ট — বাংলাদেশের জন্য তৈরি
            </span>
            <h1>
              নিজের <span className="bp-accent">বাংলা LLM</span> ট্রেন করুন — RTX 5060-তেই
            </h1>
            <p className="bp-hero-sub">
              আপনার বাংলা ডেটা দিয়ে, LitGPT + QLoRA দিয়ে, ৮GB VRAM-এ। ট্রেনিং শেষে
              api.hostamar.com/v1-এ OpenAI-compatible deploy। ক্রেডিট কার্ড লাগে না।
            </p>
            <div className="bp-hero-cta">
              <Link href="/pricing" className="bp-btn bp-btn-primary">৫০০০cr প্যাকেজ — bKash 01822417463</Link>
              <Link href="/docs" className="bp-btn bp-btn-ghost">ডকস দেখুন</Link>
            </div>
          </div>
          {/* Terminal */}
          <div className="bp-hero-poster bp-rise bp-d2">
            <div className="bp-frame">
              <div className="bp-frame-titlebar">
                <span className="bp-dot-red" /> <span className="bp-dot-amber" /> <span className="bp-dot-green" />
                <span className="bp-frame-title">bangla_llm_litgpt.py — terminal</span>
              </div>
              <pre className="bp-frame-body">
                {TERMINAL_LINES.map((l, i) => (
                  <span key={i} className={l.tone === 'cmd' ? 'bp-term-cmd' : l.tone === 'ok' ? 'bp-term-ok' : 'bp-term-dim'}>
                    {l.text}
                    {'\n'}
                  </span>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 3 STEPS */}
      <section className="bp-sec" id="how">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>৩ ধাপে আপনার মডেল</h2>
          </div>
          <div className="bp-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.2rem' }}>
            {STEPS.map((s) => (
              <div key={s.n} className="bp-tile">
                <div className="bp-how-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bp-sec bp-sec-alt">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>যা যা থাকছে</h2>
          </div>
          <div className="bp-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.2rem' }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="bp-tile">
                <div style={{ fontSize: '1.6rem' }}>{f.icon}</div>
    <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
    </div>
      </section>

      {/* PRICING */}
      <section className="bp-sec" id="pricing">
        <div className="bp-wrap" style={{ maxWidth: 720 }}>
          <div className="bp-tile" style={{ borderWidth: 3 }}>
            <h2 className="bp-h2" style={{ marginBottom: '.4rem' }}>বাংলা LLM ট্রেনিং — 5000cr</h2>
            <p style={{ textAlign: 'center', color: 'var(--bp-ink-soft)' }}>
              5000cr = ৫০০০ টাকা = ৫০০০ future HOST coin · one-time · ক্রেডিট কার্ড লাগে না
            </p>
            <ul className="bp-check">
              <li>১০০০ inference call অন্তর্ভুক্ত (1cr=1TK=1COIN)</li>
              <li>Dataset JSONL builder + selfcheck</li>
              <li>QLoRA config — RTX 5060 8GB-তেই ট্রেনিং</li>
              <li>api.hostamar.com/v1-এ deploy + hk_live API key</li>
              <li>৭ দিনের মানিব্যাক গ্যারান্টি</li>
            </ul>
            <div className="bp-hero-cta" style={{ justifyContent: 'center', marginTop: '1.2rem' }}>
              <a href="https://hostamar.com/dashboard/payment" className="bp-btn bp-btn-primary">bKash 01822417463 — এখনই শুরু করুন</a>
            </div>
            <p style={{ textAlign: 'center', marginTop: '.8rem', fontSize: '.85rem', color: 'var(--bp-ink-soft)' }}>
              bKash · Nagad · Rocket — Send Money করে TrxID দিয়ে dashboard-এ activate করুন
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bp-sec bp-sec-alt" id="faq">
        <div className="bp-wrap" style={{ maxWidth: 760 }}>
          <div className="bp-sec-head">
            <h2>সাধারণ প্রশ্ন</h2>
          </div>
          <div className="bp-faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
          </div>
          <div className="bp-hero-cta" style={{ justifyContent: 'center', marginTop: '1.6rem' }}>
            <Link href="/store" className="bp-btn bp-btn-ghost">AI Store — ১০৬+ সার্ভিস</Link>
            <Link href="/docs/sops" className="bp-btn bp-btn-ghost">৬৩ SOP গাইড</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
