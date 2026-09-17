export const metadata = { title: 'Inbox | Hostamar Admin', description: 'Unified inbox for Messenger, WhatsApp, Telegram' }

export default function AdminInboxPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">Unified Inbox</h1>
        <p className="text-sm text-[#B8AFA3]">Messenger, WhatsApp, Telegram in one place</p>
      </header>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Platform Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Messenger</span><span className="text-[#0E7C3A]">ok:true ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">WhatsApp</span><span className="text-amber-600">Needs tokens ⚠️</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Telegram</span><span className="text-[#0E7C3A]">botConfigured ✅</span></div>
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">AI Reply Draft</h2>
        <p className="text-sm text-[#B8AFA3]">Aggregates 3 platforms → AI reply draft → Human approval required before send</p>
        <div className="mt-3 text-xs text-[#1C1917]">Powered by /api/ai-services/catalog</div>
      </section>
    </div>
  )
}
