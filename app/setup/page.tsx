'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Copy, ExternalLink, Server, Mail, Database, Shield, HardDrive, Cpu } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

interface EnvField {
  label: string
  value: string
  key: string
  placeholder?: string
  secret?: boolean
}

export default function SetupPage() {
  const { t } = useLocale()
  const [copied, setCopied] = useState<string | null>(null)
  const [fields, setFields] = useState<EnvField[]>([])

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  useEffect(() => {
    setFields([
      { label: 'SMTP Host', value: '192.168.1.2', key: 'SMTP_HOST' },
      { label: 'SMTP Port', value: '1025', key: 'SMTP_PORT' },
      { label: 'SMTP User', value: '', key: 'SMTP_USER', placeholder: 'empty (no auth for local)' },
      { label: 'SMTP Pass', value: '', key: 'SMTP_PASS', placeholder: 'empty (no auth for local)' },
      { label: 'From Email', value: 'noreply@hostamar.com', key: 'FROM_EMAIL' },
      { label: 'From Name', value: 'Hostamar', key: 'FROM_NAME' },
      { label: 'S3 Endpoint', value: 'http://192.168.1.2:9000', key: 'S3_ENDPOINT' },
      { label: 'S3 Region', value: 'auto', key: 'S3_REGION' },
      { label: 'S3 Access Key', value: '•••••••• (set via .env)', key: 's3-access-key', secret: true },
      { label: 'S3 Secret Key', value: '•••••••• (set via .env)', key: 's3-secret-key', secret: true },
      { label: 'S3 Bucket', value: 'hostamar', key: 'S3_BUCKET' },
      { label: 'S3 Public URL', value: 'http://192.168.1.2:9000', key: 'S3_PUBLIC_URL' },
      { label: 'Database URL', value: '•••••••• (set via .env)', key: 'database-url', secret: true },
      { label: 'Auth Secret', value: '•••••••• (set via .env)', key: 'nextauth-secret', secret: true },
      { label: 'NEXTAUTH_URL', value: 'http://localhost:3000', key: 'NEXTAUTH_URL' },
      { label: 'Queue Secret', value: '•••••••• (set via .env)', key: 'queue-secret', secret: true },
      { label: 'OLLAMA_BASE_URL', value: 'http://localhost:11435', key: 'OLLAMA_BASE_URL' },
      { label: 'OLLAMA_VIDEO_MODEL', value: 'hermes3:latest', key: 'OLLAMA_VIDEO_MODEL' },
    ])
  }, [])

  const copyAll = () => {
    const lines = fields
      .filter(f => f.value && !f.secret)
      .map(f => `${f.key}=${f.value}`)
      .join('\n')
    copyToClipboard(lines, 'all')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">{t('setup.title')}</h1>
          <p className="text-gray-400">{t('setup.subtitle')}</p>
        </div>

        {/* Infrastructure Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Server className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Remote Machine</h3>
            </div>
            <p className="text-sm text-gray-400">192.168.1.2 — Windows DESKTOP-9KA03CQ</p>
            <p className="text-sm text-gray-400">Hermes Agent v0.14.0 + Ollama</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Compute</h3>
            </div>
            <p className="text-sm text-gray-400">Ollama: hermes3:latest + qwen3.5:9b + qwen3.6</p>
            <p className="text-sm text-gray-400">Tunnel: localhost:11435 → remote Ollama</p>
          </div>
        </div>

        {/* Step 1: Mailpit (Self-hosted SMTP) */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">1</div>
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Mailpit — SMTP Server</h2>
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Self-hosted ✓</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-3">
            <div><span className="text-gray-500">SMTP:</span> 192.168.1.2:1025</div>
            <div><span className="text-gray-500">Web UI:</span> http://192.168.1.2:8025</div>
            <div><span className="text-gray-500">Auth:</span> None (local network)</div>
            <div><span className="text-gray-500">Status:</span> ✅ Running (PID 21336)</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Replaces Resend — 100% free, unlimited emails on local network</p>
        </div>

        {/* Step 2: MinIO (Self-hosted S3) */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-sm font-bold">2</div>
            <HardDrive className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold">MinIO — S3 Storage</h2>
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Self-hosted ✓</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-3">
            <div><span className="text-gray-500">API:</span> http://192.168.1.2:9000</div>
            <div><span className="text-gray-500">Console:</span> http://192.168.1.2:9001</div>
            <div><span className="text-gray-500">Access Key:</span> •••••••• (set via .env)</div>
            <div><span className="text-gray-500">Secret Key:</span> •••••••• (set via .env)</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Replaces Uploadthing — unlimited storage on your machine</p>
        </div>

        {/* Step 3: Auth (Credentials only) */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">3</div>
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold">NextAuth — Credentials Only</h2>
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Free ✓</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">Email + password auth. No Google/Facebook. No third-party dependency.</p>
          <p className="text-xs text-gray-500">Already configured — just add your auth secret to env</p>
        </div>

        {/* Step 4: Queue & Cron */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold">4</div>
            <Database className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold">Background Queue</h2>
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Running ✓</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">Video rendering queue processes every 5 minutes via cron.</p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Queue: Prisma DB-backed VideoQueue model</p>
            <p>• Render: Ollama (hermes3) + Remotion</p>
            <p>• Cron: video-render-queue (every 5m)</p>
            <p>• Tunnel: remote-ollama-tunnel (every 30m keepalive)</p>
          </div>
        </div>

        {/* Step 5: Environment Variables */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">5</div>
            <Database className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Environment Variables</h2>
            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">Ready ✓</span>
          </div>

          {/* Copy All Button */}
          <button
            onClick={copyAll}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg mb-4 flex items-center justify-center gap-2 transition-colors"
          >
            {copied === 'all' ? (
              <><CheckCircle className="w-5 h-5" /> {t('setup.copied')}</>
            ) : (
              <><Copy className="w-5 h-5" /> {t('setup.copyAll')}</>
            )}
          </button>

          {/* Field Table */}
          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.key} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 font-mono">{field.key}</div>
                  <div className="text-sm text-green-400 font-mono truncate">{field.value || field.placeholder || '(empty)'}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(field.value, field.key)}
                  className="ml-3 p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                  title={t('setup.copyValue')}
                >
                  {copied === field.key ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Done */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">✓</div>
            <h2 className="text-xl font-semibold">All Set — No Cloud Dependency</h2>
          </div>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>✅ <strong>SMTP:</strong> Mailpit on remote Windows — unlimited</li>
            <li>✅ <strong>Storage:</strong> MinIO on remote Windows — unlimited</li>
            <li>✅ <strong>Auth:</strong> NextAuth credentials — 100% free</li>
            <li>✅ <strong>Queue:</strong> DB-backed + cron — runs locally</li>
            <li>✅ <strong>Compute:</strong> Ollama on remote — free inference</li>
            <li>✅ <strong>DB:</strong> Neon free tier — 500MB</li>
            <li>✅ <strong>Hosting:</strong> Vercel free tier — auto-deploy</li>
          </ul>
          <Link
            href="/dashboard"
            className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors"
          >
            Go to {t('setup.goToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  )
}