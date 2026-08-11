'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import AdminLayout from '@/app/admin/layout'

export default function AdminSettingsClient() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'Hostamar',
    supportEmail: 'support@hostamar.com',
    maxVideosPerMonth: '10',
    defaultQuality: '1080p',
  })

  const handleSave = () => {
    // In production, this would POST to /api/admin/settings
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4">
          Settings saved successfully!
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Site Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Max Videos Per Month (Free)</label>
            <input
              type="number"
              value={settings.maxVideosPerMonth}
              onChange={(e) => setSettings({ ...settings, maxVideosPerMonth: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Default Quality</label>
            <select
              value={settings.defaultQuality}
              onChange={(e) => setSettings({ ...settings, defaultQuality: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
