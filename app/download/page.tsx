import Link from 'next/link'

export const metadata = {
  title: 'Download Hostamar Node — Windows, macOS, Linux | Hostamar',
  description:
    'Hostamar Node ডাউনলোড — Windows .msi/.exe, macOS .dmg, Linux .deb/.AppImage। ফোন + কম্পিউটার = ডাটাসেন্টার, ০ টাকায়। 6000 ক্রেডিট, ৬টি প্রোডাক্ট, ৯৩টি মডেল।',
  keywords: ['Hostamar Node download', 'হোস্টামার নোড', 'free AI datacenter', 'Hostamar download'],
  openGraph: {
    title: 'Download Hostamar Node — 0 Taka Datacenter',
    description: 'Windows / macOS / Linux ইনস্টলার — v0.1.18, GitHub Releases থেকে সরাসরি।',
  },
}

// REAL assets from GitHub release v0.1.18 (verified via gh release view, Sep 8 2026)
const RELEASE = 'v0.1.18'
const GH = `https://github.com/romelraisul/hostamar.com/releases/download/${RELEASE}`
const ROWS = [
  { os: 'Windows', file: 'Hostamar.Node_0.1.18_x64_en-US.msi', size: '3.7 MB', href: `${GH}/Hostamar.Node_0.1.18_x64_en-US.msi` },
  { os: 'Windows', file: 'Hostamar.Node_0.1.18_x64-setup.exe', size: '2.5 MB', href: `${GH}/Hostamar.Node_0.1.18_x64-setup.exe` },
  { os: 'macOS', file: 'Hostamar.Node_0.1.18_aarch64.dmg', size: '4.0 MB', href: `${GH}/Hostamar.Node_0.1.18_aarch64.dmg` },
  { os: 'Linux', file: 'hostamar-node_0.1.18_amd64.deb', size: '5.5 MB', href: `${GH}/hostamar-node_0.1.18_amd64.deb` },
  { os: 'Linux', file: 'hostamar-node_0.1.18_amd64.AppImage', size: '90.7 MB', href: `${GH}/hostamar-node_0.1.18_amd64.AppImage` },
]

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Download Hostamar Node</h1>
      <p className="text-sm text-zinc-600 mt-2">
        Phone + Windows + Linux + Mac = Datacenter • 6000 credit • 6 products • 93 models • No money needed
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b">
            <tr>
              <th className="px-4 py-3 text-left">OS</th>
              <th className="px-4 py-3 text-left">Installer</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((r) => (
              <tr key={r.file} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium">{r.os}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.file}</td>
                <td className="px-4 py-3 text-zinc-600">{r.size}</td>
                <td className="px-4 py-3">v0.1.18</td>
                <td className="px-4 py-3 text-right">
                  <a href={r.href} className="inline-flex rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-4 py-2 text-xs font-bold">
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed bg-[#F8FAFC] p-4 text-sm text-zinc-600">
        <b>Android ও iOS?</b> এখনো নেই — CI ম্যাট্রিক্স (.github/workflows/build-tauri.yml) এখন Windows / Linux / macOS
        বানায়। মোবাইল বিল্ড যুক্ত হলে এই টেবিলে যোগ হবে। (এই সারিগুলো আগে ভুল লিংক দেখাত — ঠিক করা হয়েছে v0.1.18 রিলিজের
        আসল অ্যাসেট অনুযায়ী।)
      </div>

      <div className="mt-8 rounded-2xl bg-[#F8FAFC] border p-5">
        <div className="text-xs font-semibold tracking-widest">COMMANDS</div>
        <pre className="mt-2 text-xs bg-black text-green-400 p-3 rounded-xl overflow-auto">cloudflared tunnel list
cloudflared tunnel run hostamar-prod-new
python C:\hostamar\gateway.py
# NOT --name, NOT C:\Users\User\gateway.py</pre>
        <div className="text-xs text-zinc-600 mt-2">
          Task Scheduler: Hostamar Node at logon → cloudflared + gateway. Build: <span className="font-mono bg-white border px-1 rounded">.github/workflows/build-tauri.yml</span> on windows-latest/ubuntu-latest/macos-latest.
        </div>
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
