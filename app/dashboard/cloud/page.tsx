'use client'

/**
 * /dashboard/cloud — V31 PC-as-Cloud (No Money Plan).
 *
 * আমার PC = Cloud. Live service table when the PC is on (tracker :3006 via
 * Tailscale), honest offline banner + queue-waiting when it's off. One-click
 * ON/OFF for the optional docker-profile services. $0 cloud cost.
 */
import { useCallback, useEffect, useState } from 'react'

interface ServiceRow {
  name: string
  profile: string
  status: 'up' | 'down' | string
  port: number | null
  autoStart: boolean
  cpu: string | null
  mem: string | null
  uptimeSec: number | null
}

interface CloudStatus {
  source: string
  pcOn: boolean
  message?: string
  lastSeen?: string | null
  lastSeenAgoSec?: number
  pcUptimeSec?: number
  gpu?: { usedMB: number; totalMB: number; utilPct: number; tempC: number } | null
  tailscaleIp?: string | null
  services?: ServiceRow[] | null
  queuedVideos?: number
  cost?: string
  error?: string
}

const PROFILE_BN: Record<string, string> = {
  core: 'কোর (সবসময় চালু)',
  hosting: 'হোস্টিং',
  chat: 'চ্যাট',
  browser: 'ব্রাউজার',
  ide: 'আইডিই',
  gaming: 'গেমিং',
}

function fmtUptime(sec: number | null | undefined): string {
  if (!sec || sec < 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}ঘ ${m}মি`
  return `${m}মি`
}

function ago(sec: number | null | undefined): string {
  if (sec == null) return 'কখনও দেখা যায়নি'
  if (sec < 60) return 'এইমাত্র'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} ঘণ্টা ${m} মিনিট আগে`
  return `${m} মিনিট আগে`
}

export default function CloudDashboard() {
  const [status, setStatus] = useState<CloudStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cloud/status', { cache: 'no-store' })
      const j = await r.json()
      setStatus(j)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000) // auto-refresh 30s
    return () => clearInterval(t)
  }, [load])

  const toggle = async (service: string, action: 'up' | 'down') => {
    setToggling(service)
    try {
      const r = await fetch('/api/cloud/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, action }),
      })
      const j = await r.json()
      setToast(j.ok ? `${service} → ${action} OK` : `ব্যর্থ: ${j.error || 'PC অফলাইন'}`)
      setTimeout(() => setToast(null), 4000)
      load()
    } finally {
      setToggling(null)
    }
  }

  const services = status?.services || []
  const byProfile = services.reduce<Record<string, ServiceRow[]>>((acc, s) => {
    ;(acc[s.profile] = acc[s.profile] || []).push(s)
    return acc
  }, {})
  const upCount = services.filter((s) => s.status === 'up').length

  return (
    <div className="min-h-screen bg-[#F6F8F7] p-4 md:p-8" dir="ltr">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1B3B2F]">আমার PC = Cloud (No Money Plan)</h1>
            <p className="text-sm text-[#4A5D54]">
              V31 — আপনার কম্পিউটারই ক্লাউড। বিদ্যুৎ খরচ ছাড়া $0।
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
            <span className="text-sm font-semibold text-[#1B3B2F]">💰 Cost: $0</span>
            <span className="ml-2 text-xs text-[#4A5D54]">PC electricity only</span>
          </div>
        </div>

        {/* PC ON/OFF banner */}
        <div
          className={`rounded-2xl p-5 shadow-sm ${status?.pcOn ? 'bg-[#0E7C3A]/10 border border-[#0E7C3A]/30' : 'bg-red-50 border border-red-200'}`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`inline-block h-4 w-4 rounded-full ${status?.pcOn ? 'bg-[#0E7C3A] animate-pulse' : 'bg-red-500'}`}
            />
            <div className="flex-1">
              <div className="text-lg font-bold text-[#1B3B2F]">
                {loading ? 'লোড হচ্ছে…' : status?.pcOn ? 'PC ON — সব কোর সার্ভিস চালু' : 'PC OFF'}
              </div>
              <div className="text-sm text-[#4A5D54]">
                {status?.pcOn
                  ? `Uptime ${fmtUptime(status.pcUptimeSec)}${status.tailscaleIp ? ` · Tailscale ${status.tailscaleIp}` : ''}${status.gpu ? ` · GPU ${status.gpu.utilPct}% (${status.gpu.usedMB}/${status.gpu.totalMB}MB, ${status.gpu.tempC}°C)` : ''}`
                  : (status?.message || 'PC বন্ধ — সার্ভিস পজড।') + (status?.lastSeenAgoSec != null ? ` — শেষ দেখা: ${ago(status.lastSeenAgoSec)}` : '')}
              </div>
              {!status?.pcOn && (
                <div className="mt-1 text-sm text-[#B45309]">
                  ⏳ ভিডিও কিউ অপেক্ষা করছে: {status?.queuedVideos ?? 0} — PC চালু করলেই অটো-স্টার্ট হবে, কিউ রিজিউম হবে।
                </div>
              )}
            </div>
            <button
              onClick={load}
              className="rounded-lg bg-[#1B3B2F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0E7C3A]"
            >
              রিফ্রেশ
            </button>
          </div>
        </div>

        {toast && (
          <div className="rounded-xl bg-[#0E7C3A]/15 border border-[#0E7C3A]/30 px-4 py-2 text-sm text-[#1B3B2F]">{toast}</div>
        )}

        {/* Service table */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1B3B2F]">সার্ভিস ট্র্যাকার ({upCount}/{services.length || 15} চালু)</h2>
            <span className="text-xs text-[#4A5D54]">প্রোফাইল অনুযায়ী · ৩০ সেকেন্ডে অটো-রিফ্রেশ</span>
          </div>

          {loading && <p className="py-8 text-center text-[#4A5D54]">স্ট্যাটাস লোড হচ্ছে…</p>}

          {!loading && services.length === 0 && (
            <p className="py-8 text-center text-[#4A5D54]">
              {status?.pcOn
                ? 'ট্র্যাকার থেকে কোনো সার্ভিস তালিকা পাওয়া যায়নি।'
                : 'PC অফলাইন — শেষ heartbeat-এর ডেটা নেই। PC চালু করুন।'}
            </p>
          )}

          {Object.entries(byProfile).map(([profile, rows]) => (
            <div key={profile} className="mb-5">
              <div className="mb-1 text-sm font-semibold text-[#0E7C3A]">
                {PROFILE_BN[profile] || profile}
                {profile === 'core' && <span className="ml-2 text-xs font-normal text-[#4A5D54]">(auto-start — PC চালু হলেই আপ)</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E6EDE9] text-left text-xs text-[#4A5D54]">
                      <th className="py-2 pr-3">সার্ভিস</th>
                      <th className="py-2 pr-3">পোর্ট</th>
                      <th className="py-2 pr-3">স্ট্যাটাস</th>
                      <th className="py-2 pr-3">CPU</th>
                      <th className="py-2 pr-3">Mem</th>
                      <th className="py-2 pr-3">Uptime</th>
                      <th className="py-2">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.name} className="border-b border-[#F0F5F2]">
                        <td className="py-2 pr-3 font-medium text-[#1B3B2F]">{s.name}</td>
                        <td className="py-2 pr-3 text-[#4A5D54]">{s.port ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center gap-1 ${s.status === 'up' ? 'text-[#0E7C3A]' : 'text-red-500'}`}>
                            <span className={`inline-block h-2 w-2 rounded-full ${s.status === 'up' ? 'bg-[#0E7C3A]' : 'bg-red-500'}`} />
                            {s.status === 'up' ? 'চালু' : 'বন্ধ'}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-[#4A5D54]">{s.cpu ?? '—'}</td>
                        <td className="py-2 pr-3 text-[#4A5D54]">{s.mem ?? '—'}</td>
                        <td className="py-2 pr-3 text-[#4A5D54]">{fmtUptime(s.uptimeSec)}</td>
                        <td className="py-2">
                          {s.autoStart ? (
                            <span className="text-xs text-[#4A5D54]">কোর — সবসময় চালু</span>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                disabled={toggling === s.name || !status?.pcOn}
                                onClick={() => toggle(s.name, 'up')}
                                className="rounded-md bg-[#0E7C3A]/15 px-2 py-1 text-xs font-semibold text-[#0E7C3A] hover:bg-[#0E7C3A]/25 disabled:opacity-40"
                              >
                                {toggling === s.name ? '…' : 'ON'}
                              </button>
                              <button
                                disabled={toggling === s.name || !status?.pcOn}
                                onClick={() => toggle(s.name, 'down')}
                                className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-200 disabled:opacity-40"
                              >
                                {toggling === s.name ? '…' : 'OFF'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#4A5D54]">
          কোর: hostamar-app · postgres · redis · ComfyUI 8B · hunyuan-worker — PC ON হলেই সব কোর চালু (Task Scheduler)।
          অপশনাল সার্ভিস এক-ক্লিকে ON/OFF। ডেটা কখনও নষ্ট হয় না — কিউ অপেক্ষা করে।
        </p>
      </div>
    </div>
  )
}
