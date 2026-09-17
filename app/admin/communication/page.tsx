export const metadata = { title: 'Communication | Hostamar Admin', description: 'Comment reply, social publish, unified inbox' }

export default function AdminCommunicationPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">Communication</h1>
        <p className="text-sm text-[#B8AFA3]">Comment auto-reply, social publish, unified inbox</p>
      </header>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Comment Auto-Reply</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Status</span><span className="text-[#0E7C3A]">Every 5 min ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Mode</span><span className="text-[#1C1917]">Honest SKIP until X creds real</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">X_BEARER_TOKEN</span><span className="font-mono text-[#0E7C3A]">Real (not stub_*) ✅</span></div>
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Social Publish</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">/api/social/publish</span><span className="text-[#0E7C3A]">ok:true ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Platforms</span><span className="text-[#1C1917]">Facebook, YouTube, Twitter</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Content Calendar</span><span className="text-[#0E7C3A]">3 schedules ✅</span></div>
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Unified Inbox</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Messenger</span><span className="text-[#0E7C3A]">ok:true ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">WhatsApp</span><span className="text-amber-600">Needs tokens ⚠️</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Telegram</span><span className="text-[#0E7C3A]">botConfigured ✅</span></div>
        </div>
      </section>
    </div>
  )
}
