'use client'

import { useEffect, useState } from 'react'
import { 
  Video, 
  Server, 
  CreditCard, 
  TrendingUp,
  Users,
  Play,
  Clock
} from 'lucide-react'

interface DashboardStats {
  videos: { total: number; thisMonth: number }
  services: { active: number; total: number }
  subscription: { plan: string; status: string; nextBilling: string } | null
  storage: { used: number; total: number }
}

interface RecentVideo {
  id: string
  title: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setRecentVideos(data.recentVideos || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const statCards = [
    {
      title: 'Total Videos',
      value: stats?.videos.total || 0,
      subtext: `${stats?.videos.thisMonth || 0} this month`,
      icon: Video,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Services',
      value: stats?.services.active || 0,
      subtext: `${stats?.services.total || 0} total`,
      icon: Server,
      color: 'bg-green-500',
    },
    {
      title: 'Storage Used',
      value: `${stats?.storage.used || 0} GB`,
      subtext: `${stats?.storage.total || 0} GB total`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      title: 'Subscription',
      value: stats?.subscription?.plan || 'Free',
      subtext: stats?.subscription?.nextBilling || 'No active plan',
      icon: CreditCard,
      color: 'bg-orange-500',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700'
      case 'processing': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your account overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/dashboard/videos/new"
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Video</p>
              <p className="text-xs text-gray-500">Generate new video</p>
            </div>
          </a>
          <a
            href="/dashboard/services/new"
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Add Service</p>
              <p className="text-xs text-gray-500">Order new service</p>
            </div>
          </a>
          <a
            href="/dashboard/payment"
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Billing</p>
              <p className="text-xs text-gray-500">Manage payments</p>
            </div>
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Profile</p>
              <p className="text-xs text-gray-500">Update details</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Videos */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Videos</h2>
          <a href="/dashboard/videos" className="text-sm text-blue-600 hover:underline">
            View all
          </a>
        </div>
        {recentVideos.length > 0 ? (
          <div className="divide-y">
            {recentVideos.map((video) => (
              <div key={video.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{video.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                  {video.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No videos yet</p>
            <a href="/dashboard/videos/new" className="text-blue-600 hover:underline text-sm">
              Create your first video
            </a>
          </div>
        )}
      </div>
    </div>
  )
}