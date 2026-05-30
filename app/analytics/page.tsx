"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts"
import {
  Eye,
  Download,
  Share2,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react"

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics', { credentials: 'include' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) setAnalytics(data.data)
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">লোড হচ্ছে...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-bold text-white mb-2">কোনো ডেটা নেই</h2>
          <p className="text-gray-400">ভিডিও তৈরি করা শুরু করুন এবং এখানে অ্যানালিটিক্স দেখুন!</p>
          <button
            onClick={() => router.push('/generate')}
            className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
          >
            ভিডিও তৈরি শুরু করুন →
          </button>
        </div>
      </div>
    )
  }

  // Chart data
  const monthlyData = Object.entries(analytics.monthlyData || {}).map(([month, data]: any) => ({
    month,
    orders: data.orders,
    revenue: data.revenue
  }))

  const videoBreakdown = [
    { name: 'পূর্ণ হয়েছে', value: analytics.videoBreakdown.completed, color: '#10b981' },
    { name: 'প্রক্রিয়াজাত', value: analytics.videoBreakdown.processing, color: '#f59e0b' },
    { name: 'ব্যর্থ', value: analytics.videoBreakdown.failed, color: '#ef4444' }
  ]

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">বিশ্লেষণ ড্যাশবোর্ড</span>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Eye, label: 'মোট ভিউ', value: analytics.overview.totalViews, change: 12 },
            { icon: Download, label: 'ডাউনলোড', value: analytics.overview.totalDownloads, change: 8 },
            { icon: Share2, label: 'শেয়ার', value: analytics.overview.totalShares, change: 15 },
            { icon: DollarSign, label: 'মোট খরচ', value: `${analytics.overview.totalSpent}৳`, change: 5 }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-green-400 text-sm font-medium">↑ {stat.change}%</span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Engagement Rate Card */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">🎯 Engagement Rate</h3>
              <p className="text-3xl font-bold text-blue-400 mt-2">{analytics.overview.engagementRate}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">{analytics.overview.totalVideos} ভিডিও তৈরি</p>
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mt-2" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Revenue */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">📈 মাসিক রেভিনিউ</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Video Status */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">🎬 ভিডিও স্ট্যাটাস</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={videoBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {videoBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {videoBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-400">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Videos Table */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden mb-8">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">🏆 টপ ভিডিও</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-sm text-gray-400 font-medium">ভিডিও</th>
                  <th className="text-center px-6 py-3 text-sm text-gray-400 font-medium">ভিউ</th>
                  <th className="text-center px-6 py-3 text-sm text-gray-400 font-medium">ডাউনলোড</th>
                  <th className="text-center px-6 py-3 text-sm text-gray-400 font-medium">শেয়ার</th>
                  <th className="text-center px-6 py-3 text-sm text-gray-400 font-medium">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {(analytics.topVideos || []).map((video, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-white font-medium">{video.title}</td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      <Eye className="w-4 h-4 inline mr-1 text-blue-400" />{video.views}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      <Download className="w-4 h-4 inline mr-1 text-green-400" />{video.downloads}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      <Share2 className="w-4 h-4 inline mr-1 text-purple-400" />{video.shares}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        video.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                        video.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {video.status === 'ready' ? 'প্রস্তুত' : video.status === 'processing' ? 'প্রক্রিয়াজাত' : 'ব্যর্থ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">📋 সাম্প্রতিক অর্ডার</h3>
          </div>
          <div className="p-6 space-y-4">
            {(analytics.recentOrders || []).map((order, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <div className="text-sm font-medium text-white">{order.plan} প্যাকেজ</div>
                  <div className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString('bn-BD')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-green-400">৳{order.amount}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {order.status === 'completed' ? 'সম্পন্ন' : 'প্রক্রিয়াজাত'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}