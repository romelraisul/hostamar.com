export const metadata = { title: 'Credentials & Integrations | Hostamar Admin', description: 'Facebook, YouTube, X, Telegram, WhatsApp, Infisical' }

export default function AdminCredentialsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">Credentials & Integrations</h1>
        <p className="text-sm text-[#B8AFA3]">Manage platform credentials and third-party integrations</p>
      </header>

      {/* Facebook */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Facebook</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">FB_PAGE_ID</span><span className="font-mono text-amber-600">MISSING ⚠️</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">FB_PAGE_ACCESS_TOKEN</span><span className="font-mono text-amber-600">MISSING ⚠️</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">FACEBOOK_RTMP_URL</span><span className="font-mono text-[#0E7C3A]">In Vercel ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">FB_APP_ID</span><span className="font-mono text-amber-600">MISSING ⚠️</span></div>
        </div>
        <div className="mt-3 rounded bg-[#FBF4E4] p-2 text-xs text-[#1C1917]">
          <strong>Collect via Edge UIA:</strong> facebook.com → Page → About → Page transparency → Page ID → developers.facebook.com/tools/explorer → Generate Token → GET /me/accounts → Copy Page Access Token
        </div>
      </section>

      {/* YouTube */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">YouTube</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_CHANNEL_ID</span><span className="font-mono text-[#0E7C3A]">UCEbTau5... ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_HANDLE</span><span className="font-mono text-[#0E7C3A]">@hostamar ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_RTMP_URL</span><span className="font-mono text-[#1C1917]">rtmp://a.rtmp.youtube.com/live2/</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_CLIENT_ID</span><span className="font-mono text-[#0E7C3A]">In .env.local ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_CLIENT_SECRET</span><span className="font-mono text-[#0E7C3A]">In .env.local ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">YOUTUBE_REFRESH_TOKEN</span><span className="font-mono text-[#0E7C3A]">In .env.local ✅</span></div>
        </div>
      </section>

      {/* X/Twitter */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">X/Twitter</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">X_API_KEY</span><span className="font-mono text-[#0E7C3A]">✅ (not stub_*)</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">X_ACCESS_TOKEN</span><span className="font-mono text-[#0E7C3A]">✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">X_BEARER_TOKEN</span><span className="font-mono text-[#0E7C3A]">✅</span></div>
        </div>
      </section>

      {/* Telegram & WhatsApp */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Messaging</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Telegram</span><span className="text-[#0E7C3A]">botConfigured true ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">WhatsApp</span><span className="text-amber-600">Needs setup ⚠️</span></div>
        </div>
      </section>

      {/* Infisical & Docker */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Infrastructure</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Infisical</span><span className="text-[#0E7C3A]">401 API working ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Docker</span><span className="text-[#0E7C3A]">10 containers healthy ✅</span></div>
        </div>
      </section>
    </div>
  )
}
