'use client'

/**
 * MFA panel — zero-dep TOTP (RFC-6238). Setup → scan QR (Google
 * Authenticator) → verify 6-digit → enabled. Login then requires the code.
 */
import { useState } from 'react'
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'

export default function MfaPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [secret, setSecret] = useState('')
  const [qr, setQr] = useState('')
  const [otpauth, setOtpauth] = useState('')
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action); setMsg('')
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...extra }),
      })
      const d = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return null }
      if (!res.ok) { setMsg(d.error || 'ব্যর্থ'); return null }
      return d
    } catch { setMsg('নেটওয়ার্ক সমস্যা'); return null } finally { setBusy('') }
  }

  const loadStatus = async () => {
    const d = await call('status')
    if (d) setEnabled(!!d.mfaEnabled)
  }
  useState(() => { if (typeof window !== 'undefined') loadStatus() })

  const setup = async () => {
    const d = await call('setup')
    if (d) { setSecret(d.secret); setQr(d.qr); setOtpauth(d.otpauth); setMsg(d.message || '') }
  }

  const verify = async () => {
    const d = await call('verify', { token })
    if (d) { setEnabled(true); setSecret(''); setQr(''); setToken(''); setMsg(d.message) }
  }

  const disable = async () => {
    const d = await call('disable', { token })
    if (d) { setEnabled(false); setToken(''); setMsg(d.message) }
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        {enabled === false ? <ShieldOff className="h-4 w-4 text-zinc-400" /> : <ShieldCheck className="h-4 w-4 text-[#0E7C3A]" />}
        দুই-ধাপ যাচাই (MFA)
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Google Authenticator দিয়ে অ্যাকাউন্ট সুরক্ষিত করুন — লগ ইনে প্রতিবার 6-digit কোড লাগবে।
      </p>

      {msg && <div className="mt-3 rounded-lg bg-[#ECFDF5] p-2.5 text-xs text-[#0E7C3A]">{msg}</div>}

      {enabled === null ? (
        <p className="mt-3 text-xs text-zinc-400">লোড হচ্ছে…</p>
      ) : enabled ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-emerald-600">✅ MFA চালু আছে</p>
          <div className="mt-2 flex gap-2">
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="6-digit কোড"
              inputMode="numeric"
              maxLength={6}
              className="w-32 rounded-lg border p-2 text-sm"
            />
            <button onClick={disable} disabled={busy === 'disable' || token.length !== 6}
              className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40">
              {busy === 'disable' ? '...' : 'বন্ধ করুন'}
            </button>
          </div>
        </div>
      ) : qr ? (
        <div className="mt-3 space-y-3">
          <img src={qr} alt="MFA QR" width={220} height={220} className="rounded-lg border" />
          <p className="break-all rounded-lg bg-zinc-50 p-2 font-mono text-[10px] text-zinc-500">{secret}</p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="6-digit কোড"
              inputMode="numeric"
              maxLength={6}
              className="w-32 rounded-lg border p-2 text-sm"
            />
            <button onClick={verify} disabled={busy === 'verify' || token.length !== 6}
              className="rounded-lg bg-[#0E7C3A] px-3 py-2 text-xs font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300">
              {busy === 'verify' ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ চালু করুন'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={setup} disabled={busy === 'setup'}
          className="mt-3 rounded-lg bg-[#0E7C3A] px-3 py-2 text-xs font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300">
          {busy === 'setup' ? 'তৈরি হচ্ছে...' : '+ MFA চালু করুন'}
        </button>
      )}
    </div>
  )
}
