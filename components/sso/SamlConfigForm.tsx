'use client'

import { useState } from 'react'

export default function SamlConfigForm({ initial }: { initial?: any }) {
  const [slug, setSlug] = useState(initial?.org?.slug || '')
  const [name, setName] = useState(initial?.org?.name || '')
  const [domain, setDomain] = useState(initial?.org?.domain || '')
  const [ssoEnforced, setSsoEnforced] = useState(!!initial?.org?.ssoEnforced)
  const [idpMetadataUrl, setIdpMetadataUrl] = useState(initial?.conn?.idpMetadataUrl || '')
  const [idpMetadataXml, setIdpMetadataXml] = useState(initial?.conn?.idpMetadataXml || '')
  const [spEntityId, setSpEntityId] = useState(initial?.conn?.spEntityId || '')
  const [spAcsUrl, setSpAcsUrl] = useState(initial?.conn?.spAcsUrl || '')
  const [status, setStatus] = useState<{ type: 'idle' | 'saving' | 'ok' | 'err'; msg?: string }>({ type: 'idle' })
  const [fetching, setFetching] = useState(false)

  // Fetch + parse IdP metadata from a URL (server-side, to avoid CORS).
  async function fetchMetadata() {
    if (!idpMetadataUrl.trim()) return
    setFetching(true)
    try {
      const res = await fetch('/api/admin/saml/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: idpMetadataUrl.trim() }),
      })
      const data = await res.json()
      if (data.xml) {
        setIdpMetadataXml(data.xml)
        setStatus({ type: 'idle', msg: 'Metadata loaded from URL.' })
      } else {
        setStatus({ type: 'err', msg: data.error || 'Failed to fetch metadata' })
      }
    } catch (e: any) {
      setStatus({ type: 'err', msg: e?.message || 'fetch failed' })
    } finally {
      setFetching(false)
    }
  }

  async function save() {
    setStatus({ type: 'saving' })
    try {
      const res = await fetch('/api/admin/saml/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, domain, ssoEnforced, idpMetadataUrl, idpMetadataXml }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'err', msg: data.error || 'Save failed' })
        return
      }
      setSpEntityId(data.conn.spEntityId)
      setSpAcsUrl(data.conn.spAcsUrl)
      setStatus({ type: 'ok', msg: 'SAML connection saved + registered with Jackson.' })
    } catch (e: any) {
      setStatus({ type: 'err', msg: e?.message || 'save failed' })
    }
  }

  function testLogin() {
    window.location.href = `/api/auth/saml/login?tenant=${encodeURIComponent(slug)}`
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Enterprise SAML SSO</h1>
      <p className="text-sm text-slate-500 mb-6">
        Tenant-specific SAML 2.0 per organization. Provide your IdP metadata (Okta / Azure AD / OneLogin).
      </p>

      <div className="space-y-4 bg-white rounded-xl shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Tenant slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-corp"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">
            Organization name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="text-sm font-medium block">
          Email domain (for SSO discovery &amp; enforcement)
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com"
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </label>

        <div>
          <p className="text-sm font-medium mb-1">IdP metadata</p>
          <div className="flex gap-2 mb-2">
            <input value={idpMetadataUrl} onChange={(e) => setIdpMetadataUrl(e.target.value)}
              placeholder="https://your-idp/metadata.xml"
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <button onClick={fetchMetadata} disabled={fetching}
              className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm disabled:opacity-50">
              {fetching ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          <textarea value={idpMetadataXml} onChange={(e) => setIdpMetadataXml(e.target.value)}
            placeholder="Paste IdP metadata XML here (or use Fetch above)"
            rows={6} className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ssoEnforced} onChange={(e) => setSsoEnforced(e.target.checked)} />
          Enforce SSO for this domain (disables password login for matching emails)
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={status.type === 'saving'}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50">
            {status.type === 'saving' ? 'Saving…' : 'Save connection'}
          </button>
          {spEntityId && (
            <button onClick={testLogin}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium">
              Test login → IdP
            </button>
          )}
        </div>

        {status.msg && (
          <div className={`text-sm mt-2 ${status.type === 'err' ? 'text-red-600' : 'text-green-700'}`}>
            {status.msg}
          </div>
        )}

        {spEntityId && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs space-y-1">
            <p className="font-medium text-slate-700">SP configuration (give these to your IdP):</p>
            <p><span className="font-semibold">Entity ID:</span> <code className="break-all">{spEntityId}</code></p>
            <p><span className="font-semibold">ACS URL:</span> <code className="break-all">{spAcsUrl}</code></p>
            <p className="text-slate-500">Metadata: <code>/api/auth/saml/metadata?tenant={slug}</code></p>
          </div>
        )}
      </div>
    </div>
  )
}
