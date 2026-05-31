'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Film, CreditCard, Eye, TrendingUp } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

export default function AnalyticsPage() {
  const { t } = useLocale()
  const [stats, setStats] = useState({ totalVideos: 0, totalPreviews: 0, creditsRemaining: 0 })

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const monthlyData = [
    { name: 'Jan', videos: 2, previews: 5 },
    { name: 'Feb', videos: 4, previews: 8 },
    { name: 'Mar', videos: 3, previews: 12 },
    { name: 'Apr', videos: 6, previews: 15 },
    { name: 'May', videos: 8, previews: 20 },
  ]

  const cards = [
    { label: t('dashAnalytics.videosCreated'), value: stats.totalVideos, icon: Film, color: 'text-blue-400 bg-blue-500/10' },
    { label: t('dashAnalytics.aiPreviews'), value: stats.totalPreviews, icon: Eye, color: 'text-purple-400 bg-purple-500/10' },
    { label: t('dashAnalytics.creditsLeft'), value: stats.creditsRemaining, icon: CreditCard, color: 'text-green-400 bg-green-500/10' },
    { label: t('dashAnalytics.growthRate'), value: '+24%', icon: TrendingUp, color: 'text-yellow-400 bg-yellow-500/10' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{t('dashAnalytics.title')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-sm text-gray-400">{card.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('dashAnalytics.monthlyActivity')}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="videos" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('dashAnalytics.videos')} />
            <Bar dataKey="previews" fill="#a855f7" radius={[4, 4, 0, 0]} name={t('dashAnalytics.previews')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
