import Link from 'next/link'

const GREEN = '#0E7C3A'

export default function BazaarFooter() {
  return (
    <footer className="bp-foot">
      <div className="bp-wrap">
        <div className="bp-foot-grid">
          {/* Column 1: Brand */}
          <div className="bp-foot-brand">
            <Link className="bp-brand" href="/">
              <span className="bp-brand-chip" aria-hidden="true">
                <svg viewBox="0 0 64 64"><polygon points="7,15 19,10 19,54 7,49" fill="#22755E" /><polygon points="57,15 45,10 45,54 57,49" fill="#1E9E3E" /><polygon points="26,19 26,45 45,32" fill="#12C24C" /></svg>
              </span>
              <span className="bp-brand-name">Hostamar</span>
            </Link>
            <p className="mt-3 text-zinc-400">বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার। ঢাকা থেকে ❤️ দিয়ে তৈরি।</p>
            <div className="mt-4 flex gap-4 text-zinc-400">
              <a href="https://facebook.com/romelraisul" aria-label="Facebook" className="hover:text-white transition">Facebook</a>
              <a href="https://youtube.com/@hostamar" aria-label="YouTube" className="hover:text-white transition">YouTube</a>
            </div>
          </div>

          {/* Column 2: Products */}
          <div>
            <h4 className="text-white font-semibold">পণ্যসমূহ</h4>
            <ul className="mt-2 space-y-2 text-zinc-400">
              <li><Link href="/video" className="hover:text-white transition">AI ভিডিও</Link></li>
              <li><Link href="/video-os" className="hover:text-white transition">ডাবিং</Link></li>
              <li><Link href="/hosting" className="hover:text-white transition">ক্লাউড হোস্টিং</Link></li>
              <li><Link href="/chat" className="hover:text-white transition">AI চ্যাট</Link></li>
              <li><Link href="/browser" className="hover:text-white transition">AI ব্রাউজার</Link></li>
              <li><Link href="/game" className="hover:text-white transition">গেম</Link></li>
              <li><Link href="/ide" className="hover:text-white transition">Dev IDE</Link></li>
            </ul>
          </div>

          {/* Column 3: Docs */}
          <div>
            <h4 className="text-white font-semibold">📚 ডকস</h4>
            <ul className="mt-2 space-y-3 text-zinc-400 leading-snug">
              <li>
                <Link href="/docs" className="hover:text-white transition">ডকুমেন্টেশন ৬০৭ সার্ভিস · ৫১০ মডেল · Orca ADE · ৬cr=1TK=1COIN</Link>
              </li>
              <li>
                <Link href="/bangla-llm" className="hover:text-white transition">বাংলা LLM ট্রেনিং — 5000cr</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">নিজের মডেল, QLoRA RTX 5060 8GB, api.hostamar.com/v1 & deploy</p>
              </li>
              <li>
                <Link href="/docs/bn" className="hover:text-white transition">বাংলা ডকস</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">সম্পূর্ণ ডকুমেন্টেশন বাংলায়</p>
              </li>
              <li>
                <Link href="/docs/sops" className="hover:text-white transition">৬৩ SOP স্টোর</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">সাহায্য সার্ভিস গাইড, hk_live curl</p>
              </li>
              <li>
                <Link href="/api/v1/models" className="hover:text-white transition">API / মডেল তালিকা</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">120 models — OpenAI compatible</p>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h4 className="text-white font-semibold">কোম্পানি</h4>
            <ul className="mt-2 space-y-2 text-zinc-400">
              <li><Link href="/about" className="hover:text-white transition">আমাদের সম্পর্কে</Link></li>
              <li><Link href="/blog" className="hover:text-white transition">ব্লগ</Link></li>
              <li><Link href="/careers" className="hover:text-white transition">ক্যারিয়ার</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">যোগাযোগ</Link></li>
            </ul>
          </div>

          {/* Column 5: Store & Ecosystem */}
          <div>
            <h4 className="text-white font-semibold">🛍️ শেয়ার ও ইকোসিস্টেম</h4>
            <ul className="mt-2 space-y-3 text-zinc-400 leading-snug">
              <li>
                <Link href="/store" className="hover:text-white transition">AI Store — ৬০৮+ সার্ভিস</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">সব AI সার্ভিস এক জায়গায় — ৬cr=1TK</p>
              </li>
              <li>
                <Link href="/coinlab" className="hover:text-white transition">CoinLab BD — ক্রিপ্টো রিসার্চ</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">বাংলা ক্রিপ্টো রিসার্চ, ৭-সেকশন ড্যাশবোর্ড</p>
              </li>
              <li>
                <Link href="/labs" className="hover:text-white transition">Labs — AI Desk ও টোকেন সেফটি</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">ক্যাশ থেকে ব্রীফন, BTC মনিটর, পেপার ট্রেডিং</p>
              </li>
              <li>
                <Link href="/download" className="hover:text-white transition">ডাউনলোড — Hostamar Node</Link>
                <p className="text-[12px] text-zinc-500 mt-0.5">ফোন + কম্পিউটার = ডাটাসেন্টার</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <div className="space-y-4 text-[13px] text-zinc-400">
            <div className="flex flex-wrap gap-2">
              <span className="font-semibold">লিগাল ও পেমেন্ট:</span>
              <Link href="/terms" className="hover:text-white transition">শর্তাবলী</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/privacy" className="hover:text-white transition">প্রাইভেসি</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/refund" className="hover:text-white transition">রিফান্ড</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-white">bKash</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-white">Nagad</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-white">Rocket</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-white">Upay</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">🔒 SSL</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">৭ দিনের মানি-ব্যাক</span>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">ম্যানুয়াল সেট জানি</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-zinc-800 pt-6 text-[12px] text-zinc-500 sm:flex-row">
            <span>© 2026 Hostamar. All rights reserved.</span>
            <span className="flex items-center gap-1.5">
              📚 <Link href="/docs" className="hover:text-white transition">ডকস</Link> · ৬০৬ সার্ভিস · ৫১০ মডেল · Orca ADE · ৬cr=1TK=1COIN · ৬০০০ টোকেন · bKash 01822417463
            </span>
            <span className="flex items-center gap-1.5">
              Made for Bangladesh 🇧🇩
              <span className="ml-2 inline-flex items-center justify-center rounded-full w-10 h-10 bg-[#0E7C3A]/20 text-[#0E7C3A]">
                💬
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}