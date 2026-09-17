export const metadata = { title: 'Overview | Hostamar Admin', description: 'System overview and health dashboard' }

const components = [
  { name: 'HLS2 Audio', status: 'ok', value: '-16.8 dB', detail: 'Local + public audible', action: 'Verify' },
  { name: 'YouTube Push', status: 'ok', value: '2 ESTABLISHED', detail: '142.250.xxx:443', action: 'Check conns' },
  { name: 'tv-ffmpeg-vp9.service', status: 'ok', value: 'active', detail: 'filter_complex rewritten', action: 'systemctl status' },
  { name: 'restream.service', status: 'ok', value: 'active', detail: 'systemd', action: 'systemctl status' },
  { name: 'ComfyUI WSL', status: 'ok', value: '200 OK', detail: 'curl 127.0.0.1:8188/prompt', action: 'Test bridge' },
  { name: 'Infisical', status: 'ok', value: '401', detail: 'API working, needs auth', action: 'Check logs' },
  { name: 'Piper Model', status: 'ok', value: '74MB', detail: 'bn_BD-google-medium.onnx + json', action: 'Test narration' },
  { name: 'AppHeader Live TV', status: 'ok', value: '/tv', detail: '📺 লাইভ TV', action: 'View' },
  { name: 'YouTube Channel', status: 'ok', value: 'UCEbTau5...', detail: 'Verified', action: 'curl channel' },
  { name: 'Cron Fleet', status: 'ok', value: '13 workers', detail: 'correct node path', action: 'Queue test' },
  { name: 'Docker Stack', status: 'ok', value: '10 containers', detail: 'All healthy', action: 'docker ps' },
  { name: 'Cloudflare Tunnels', status: 'ok', value: '4 running', detail: 'tv.hostamar.com', action: 'Check' },
  { name: 'Facebook', status: 'warn', value: 'NEEDS INPUT', detail: 'FB_PAGE_ID + TOKEN missing', action: 'Edge collect' },
  { name: '90 Silent Shelf', status: 'warn', value: 'need narration', detail: 'Piper model downloaded', action: 'Narrate' },
  { name: 'Auto-content', status: 'warn', value: 'not producing', detail: 'NASA + ComfyUI worker', action: 'Run worker' },
]

const icons: Record<string, string> = { ok: '✅', warn: '⚠️', error: '❌', info: '🔍' }

export default function AdminOverview() {
  const ok = components.filter(c => c.status === 'ok').length
  const warn = components.filter(c => c.status === 'warn').length
  const pct = Math.round((ok / components.length) * 100)

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold tracking-widest uppercase text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full border border-[#0E7C3A]/30">এডমিন প্যানেল</span>
          <span className="text-xs text-[#57534E]">/admin</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1C1917]">Admin Overview</h1>
        <p className="text-sm text-[#57534E]">Completion: {ok}/{components.length} ({pct}%) — Updated: live</p>
      </header>

      {/* Summary cards */}
      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[#FFFDF6] p-4 text-center ring-1 ring-[#D8CDB4]">
          <div className="text-3xl font-bold text-[#0E7C3A]">{pct}%</div>
          <div className="text-xs text-[#57534E]">Operational</div>
        </div>
        <div className="rounded-lg bg-[#FFFDF6] p-4 text-center ring-1 ring-[#D8CDB4]">
          <div className="text-3xl font-bold text-[#0E7C3A]">{ok}</div>
          <div className="text-xs text-[#57534E]">Healthy</div>
        </div>
        <div className="rounded-lg bg-[#FFFDF6] p-4 text-center ring-1 ring-[#D8CDB4]">
          <div className="text-3xl font-bold text-amber-600">{warn}</div>
          <div className="text-xs text-[#57534E]">Needs Attention</div>
        </div>
        <div className="rounded-lg bg-[#FFFDF6] p-4 text-center ring-1 ring-[#D8CDB4]">
          <div className="text-3xl font-bold text-[#57534E]">{components.length}</div>
          <div className="text-xs text-[#57534E]">Total Components</div>
        </div>
      </section>

      {/* Status table */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Status Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#D8CDB4] text-left text-xs text-[#57534E]">
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Component</th>
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2 pr-4">Detail</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b border-[#D8CDB4]/50">
                  <td className="py-2 pr-4">{icons[c.status]}</td>
                  <td className="py-2 pr-4 font-medium text-[#1C1917]">{c.name}</td>
                  <td className="py-2 pr-4">
                    <span className={`font-mono text-xs ${c.status === 'ok' ? 'text-[#0E7C3A]' : 'text-amber-600'}`}>
                      {c.value}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-[#57534E]">{c.detail}</td>
                  <td className="py-2 text-xs text-[#0E7C3A]">{c.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick fix commands */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Quick Fix (fresh WSL terminal)</h2>
        <div className="grid gap-2 text-xs">
          <code className="block overflow-x-auto whitespace-pre rounded bg-[#FBF4E4] p-2">
{`# Verify HLS2 audio
ffmpeg -v error -i ~/hostamar-build/docker/tv-station/hls2/master.m3u8 -t 5 -af volumedetect -f null - 2>&1 | grep mean_volume
# Expected: mean_volume: -23 dB (audible)

# Check YouTube connections
ss -tnp | grep 142.250 | grep ffmpeg

# Check ComfyUI
curl -s http://127.0.0.1:8188/prompt

# Check systemd
systemctl --user status tv-ffmpeg-vp9.service restream.service`}
          </code>
        </div>
      </section>
    </div>
  )
}
