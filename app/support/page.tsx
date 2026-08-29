import SupportChatWidget from '@/components/support-chat-widget'

export const dynamic = 'force-dynamic'

export default function SupportPage(){
  return (
    <div className="min-h-screen bg-[#050A06] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black tracking-tight">Support — Hostamar</h1>
        <p className="text-sm text-zinc-400 mt-2">Chat with our Google Gemini AI (Vercel AI Gateway) — Bangla + English. For human help, email support@hostamar.com or bKash 01822417463.</p>
        <div className="mt-6 grid gap-3 text-sm">
          <a href="/dashboard/payment" className="rounded-xl border border-[#0E7C3A]/30 bg-[#0E7C3A]/10 p-4 hover:bg-[#0E7C3A]/20">💳 bKash payment — Send to 01822417463 then enter TrxID at <span className="text-[#10B981]">/dashboard/payment</span></a>
          <a href="/dashboard/storage" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">💾 Storage B2 5GB free — s3.us-east-005 hostamar-prod</a>
          <a href="/tv" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">📺 TV 3700 channels — stable 20</a>
          <a href="/admin/chat" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">👑 Founder OS — /admin/chat (admin only)</a>
        </div>
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="font-bold">FAQ</h2>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            <div><b>Q: bKash করেছি, TrxID কোথায় দেব?</b><br/>A: /dashboard/payment এ TrxID + amount দিন, admin /admin/payments এ approve করবে।</div>
            <div><b>Q: Storage কত?</b><br/>A: 5GB free, endpoint s3.us-east-005 bucket hostamar-prod key 005a26c99e410200000000001</div>
            <div><b>Q: Pricing?</b><br/>A: Starter 599 / Pro 1299 / Business 2999 BDT</div>
          </div>
        </div>
        <div className="mt-6 text-xs text-zinc-600">Widget uses Google Gemini via Vercel AI Gateway (vgw_...) with fallback to litellm http://litellm:4000/v1 and mock. Model: google/gemini-2.5-flash-lite or gpt-oss-120b.</div>
      </div>
      <SupportChatWidget />
    </div>
  )
}
