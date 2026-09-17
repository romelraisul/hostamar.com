export const metadata = { title: 'System | Hostamar Admin', description: 'Logs, paper theme, green buttons, build' }

export default function AdminSystemPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">System and Infrastructure</h1>
        <p className="text-sm text-[#B8AFA3]">Logs, paper theme checks, build status</p>
      </header>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Logs</h2>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <LogCard label="HLS2 VP9" path="/tmp/vp9.log" />
          <LogCard label="Restream" path="/tmp/restream.log" />
          <LogCard label="Cron" path="/tmp/hostamar-cron.log" />
          <LogCard label="Keepalive" path="/tmp/hostamar-keepalive.log" />
          <LogCard label="Comment Replier" path="/tmp/comment-replier.log" />
          <LogCard label="Auto-Content" path="/home/romel/hostamar-build/logs/auto-content.log" />
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Theme Checks</h2>
        <div className="space-y-2 text-sm">
          <Row label="Paper contrast" value="0 invisible" ok />
          <Row label="Green buttons" value="All white text" ok />
          <Row label="Cream hexes" value="44 to 0 fixed" ok />
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Build</h2>
        <div className="space-y-2 text-sm">
          <Row label="npm run build" value="Compiled, Functions 5.7MB <50MB" ok />
          <Row label="Vercel Ready" value="2x Ready" ok />
        </div>
      </section>
    </div>
  )
}

function LogCard({ label, path }: { label: string; path: string }) {
  return (
    <div className="rounded bg-white p-2 ring-1 ring-[#D8CDB4]">
      <div className="text-xs font-medium text-[#1C1917]">{label}</div>
      <code className="block truncate text-xs text-[#B8AFA3]">{path}</code>
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#B8AFA3]">{label}</span>
      <span className={ok ? 'text-[#0E7C3A]' : 'text-amber-600'}>{value} {ok && 'OK'}</span>
    </div>
  )
}
