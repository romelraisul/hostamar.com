import Link from 'next/link'
export const metadata = { title: 'Download — Hostamar Node 0 Taka Datacenter' }
const GH = 'https://github.com/romelraisul/hostamar.com/releases/download/v0.1.2'
const ROWS = [
  { os: 'Windows', file: 'Hostamar-Node_x64_en-US.msi', size: '3.3 MB', href: `${GH}/Hostamar-Node_x64_en-US.msi`, alt: 'Hostamar-Node_x64-setup.exe' },
  { os: 'Windows', file: 'Hostamar-Node_x64-setup.exe', size: '2.3 MB', href: `${GH}/Hostamar-Node_x64-setup.exe`, alt: null },
  { os: 'macOS', file: 'Hostamar-Node_aarch64.dmg', size: '3.7 MB', href: `${GH}/Hostamar-Node_aarch64.dmg`, alt: 'Hostamar-Node_x64.dmg' },
  { os: 'Linux', file: 'Hostamar-Node_1.0.0_amd64.deb', size: 'pending', href: 'https://github.com/romelraisul/hostamar.com/releases/tag/v0.1.2', alt: 'Hostamar-Node_1.0.0_amd64.AppImage' },
  { os: 'Linux', file: 'Hostamar-Node_1.0.0_amd64.AppImage', size: 'pending', href: 'https://github.com/romelraisul/hostamar.com/releases/tag/v0.1.2', alt: null },
  { os: 'Android', file: 'Hostamar-Node.apk', size: 'pending', href: 'https://github.com/romelraisul/hostamar.com/releases/tag/v0.1.2', alt: null },
  { os: 'iOS', file: 'TestFlight', size: '—', href: 'https://testflight.apple.com/join/hostamar', alt: null },
]
export default function DownloadPage(){
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Download Hostamar Node</h1>
      <p className="text-sm text-zinc-600 mt-2">Phone + Windows + Linux + Mac = Datacenter • 6000 credit • 6 products • 93 models • No money needed</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b"><tr><th className="px-4 py-3 text-left">OS</th><th className="px-4 py-3 text-left">Installer</th><th className="px-4 py-3 text-left">Size</th><th className="px-4 py-3 text-left">Version</th><th className="px-4 py-3 text-right"></th></tr></thead>
          <tbody className="divide-y">
            {ROWS.map(r=>(
              <tr key={r.file} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium">{r.os}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.file}</td>
                <td className="px-4 py-3 text-zinc-600">{r.size}</td>
                <td className="px-4 py-3">v0.1.2</td>
                <td className="px-4 py-3 text-right"><a href={r.href} className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-4 py-2 text-xs font-bold">Download</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 rounded-2xl bg-[#F8FAFC] border p-5">
        <div className="text-xs font-semibold tracking-widest">COMMANDS</div>
        <pre className="mt-2 text-xs bg-black text-green-400 p-3 rounded-xl overflow-auto">cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new
python C:\hostamar\gateway.py
# NOT --name, NOT C:\Users\User\gateway.py</pre>
        <div className="text-xs text-zinc-600 mt-2">Task Scheduler: Hostamar Node at logon → cloudflared + gateway. Build: <span className="font-mono bg-white border px-1 rounded">.github/workflows/build-tauri.yml</span> on windows-latest/ubuntu-latest/macos-latest.</div>
      </div>
      <div className="mt-6 rounded-2xl border p-5">
        <div className="text-xs font-semibold tracking-widest">FAQ</div>
        <p className="text-sm mt-2"><b>JumpServer?</b> No — use Tailscale free 100 devices. JumpServer needs 4GB RAM not for phone.</p>
        <p className="text-sm mt-1"><b>Phone fallback?</b> Android Foreground Service keeps tunnel alive when minimized. iOS BackgroundFetch best-effort.</p>
      </div>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full border bg-white px-5 py-2.5 text-sm">← Home</Link>
        <Link href="/dashboard" className="rounded-full bg-[#0E7C3A] text-white px-5 py-2.5 text-sm font-bold">Dashboard →</Link>
      </div>
    </div>
  )
}
