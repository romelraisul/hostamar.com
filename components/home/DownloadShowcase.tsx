'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const RELEASE = 'v0.1.4'
const GH = 'https://github.com/romelraisul/hostamar.com/releases/download/v0.1.4'
const LINKS = [
  { os: 'Windows', file: 'Hostamar-Node_x64_en-US.msi', label: 'Download for Windows', icon: '🪟', href: `${GH}/Hostamar-Node_x64_en-US.msi`, secondary: `${GH}/Hostamar-Node_x64-setup.exe` },
  { os: 'macOS', file: 'Hostamar-Node_aarch64.dmg', label: 'Download for Mac', icon: '🍎', href: `${GH}/Hostamar-Node_aarch64.dmg`, secondary: null },
  { os: 'Linux', file: 'Hostamar-Node_1.0.0_amd64.deb', label: 'Download for Linux', icon: '🐧', href: `${GH}/Hostamar-Node_1.0.0_amd64.deb`, secondary: `${GH}/Hostamar-Node_1.0.0_amd64.AppImage` },
  { os: 'Android', file: 'Hostamar-Node.apk', label: 'Download for Android', icon: '🤖', href: 'https://github.com/romelraisul/hostamar.com/releases/tag/v0.1.4', secondary: null },
  { os: 'iOS', file: 'TestFlight', label: 'Join TestFlight', icon: '📱', href: 'https://testflight.apple.com/join/hostamar', secondary: null },
]

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Windows'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS'
  if (/mac/.test(ua)) return 'macOS'
  if (/linux/.test(ua)) return 'Linux'
  return 'Windows'
}

export default function DownloadShowcase() {
  const [os, setOs] = useState('Windows')
  useEffect(()=> setOs(detectOS()), [])
  const primary = LINKS.find(l=> l.os===os) || LINKS[0]
  const others = LINKS.filter(l=> l.os!==os)
  return (
    <section className="mt-8 rounded-[24px] border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 md:px-8 py-8 md:py-10">
        <div className="max-w-3xl">
          <h2 className="text-[26px] md:text-[32px] font-bold leading-tight tracking-[-0.02em]">আপনার ফোন + কম্পিউটার = ডাটাসেন্টার</h2>
          <p className="text-[15px] font-semibold text-[#0E7C3A] mt-1">No money needed</p>
          <p className="text-sm text-zinc-600 mt-3">Windows / Linux / Mac / Android / iOS background node — PC down হলে ফোন browser/comfy/api 200 রাখে, 530 নয়। 6000 credit per account।</p>
        </div>

        {/* Credit meter */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0E7C3A] text-white px-4 py-2 text-sm font-bold">6000/6000 79% <span className="w-20 h-1.5 bg-white/30 rounded-full overflow-hidden"><span className="block h-full bg-white rounded-full" style={{width:'79%'}}/></span></span>
          <span className="text-xs text-zinc-600">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Hosting 0</span>
        </div>

        {/* Primary download */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={primary.href} className="inline-flex items-center gap-2 rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] text-white px-6 py-3 font-bold text-sm shadow">
            <span>{primary.icon}</span> {primary.label} • {RELEASE}
          </a>
          {primary.secondary && <a href={primary.secondary} className="inline-flex items-center rounded-full border bg-white px-5 py-3 text-sm font-medium hover:bg-zinc-50">{primary.file.includes('.exe')?'Alternative .exe':'Alternative'} setup</a>}
          <Link href="/download" className="inline-flex items-center rounded-full border bg-white px-5 py-3 text-sm font-medium hover:bg-zinc-50">All downloads →</Link>
        </div>

        {/* Other OS pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map(o=>(
            <a key={o.os} href={o.href} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
              <span>{o.icon}</span> {o.os} • {o.file}
            </a>
          ))}
        </div>

        {/* Trust */}
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">BDIX 20ms</span>
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">bKash</span>
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">Tailscale 100.x</span>
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">Cloudflare 6815:210e</span>
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">93 models</span>
          <span className="rounded-full bg-[#F8FAFC] border px-3 py-1">Open Source</span>
        </div>

        {/* How it works */}
        <div className="mt-8 rounded-2xl bg-[#F8FAFC] border p-5">
          <div className="text-xs font-semibold tracking-widest text-zinc-500">HOW IT WORKS</div>
          <div className="mt-3 font-mono text-xs text-zinc-700">Phone + Windows + Linux + Mac → <span className="text-[#0E7C3A] font-bold">cloudflared tunnel run hostamar-prod-new</span> → Worker PRIMARY→FALLBACK_URL Railway → hostamar.com 200 + browser 200 + comfy 200 + ai 200 93 models</div>
          <ol className="mt-3 text-sm text-zinc-600 list-decimal list-inside space-y-1">
            <li>Download Node App</li><li>Login</li><li>Dashboard → My Nodes ONLINE/OFFLINE + 6 products + 6000 credit</li>
          </ol>
        </div>

        {/* Dashboards preview */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5">
            <div className="text-xs font-semibold tracking-widest text-[#0E7C3A]">CUSTOMER</div>
            <div className="text-sm font-bold mt-1">Dashboard 6 products + NodeStatus</div>
            <div className="text-xs text-zinc-600 mt-1">Video/Hosting/Chat/Browser/IDE·93/Game + Windows OFFLINE/browser 530 → run <span className="font-mono bg-zinc-100 px-1 rounded">cloudflared tunnel run hostamar-prod-new</span> + <span className="font-mono bg-zinc-100 px-1 rounded">python C:\hostamar\gateway.py</span> → 200</div>
            <Link href="/dashboard" className="mt-3 inline-flex rounded-full bg-[#0E7C3A] text-white px-4 py-2 text-xs font-bold">Open Dashboard →</Link>
          </div>
          <div className="rounded-2xl border p-5 bg-[#0F172A] text-white">
            <div className="text-xs tracking-widest text-white/60">ADMIN</div>
            <div className="text-sm font-bold mt-1">8 tabs • 93 models • 6000 edit</div>
            <div className="text-xs text-white/60 mt-1">Overview/Users/Credits/Transactions/Models·93/Products·6/Hosting/Nodes + ?limit=50 + bKash approve + toggle</div>
            <Link href="/admin/nodes" className="mt-3 inline-flex rounded-full bg-white text-[#0F172A] px-4 py-2 text-xs font-bold">Open Nodes →</Link>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t px-5 py-3 flex items-center justify-between gap-3">
        <span className="text-sm"><span className="font-bold">Download for {os}</span> • v0.1.3 • {primary.file}</span>
        <a href={primary.href} className="rounded-full bg-[#0E7C3A] text-white px-5 py-2 text-sm font-bold hover:bg-[#0c6a32]">Download →</a>
      </div>
    </section>
  )
}
