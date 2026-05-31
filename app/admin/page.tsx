"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  Check,
  X
} from "lucide-react"
import { useLocale } from "@/lib/locale-context"

export default function AdminDashboard() {
  const { t } = useLocale()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, customersRes, ordersRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/customers?limit=50', { credentials: 'include' }),
        fetch('/api/admin/orders?limit=100', { credentials: 'include' })
      ])
      const statsData = await statsRes.json()
      const customersData = await customersRes.json()
      const ordersData = await ordersRes.json()
      if (statsData.success) setStats(statsData.data)
      if (customersData.success) setCustomers(customersData.data)
      if (ordersData.success) setOrders(ordersData.data)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      if ((err as Error).message?.includes('401')) router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, change, color }: any) => (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">{t('logs.loading')}</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Eye className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">{t('admin.title') || 'Admin Dashboard'}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('admin.welcome') || 'Welcome, Admin!'}</h1>
              <p className="text-gray-400 mt-1">{t('admin.welcomeDesc') || 'View your platform overview'}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">{t('admin.today') || "Today's Date"}</div>
              <div className="text-lg font-bold text-white">{new Date().toLocaleDateString('en-US')}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label={t('admin.totalCustomers') || 'Total Customers'}
            value={stats?.totalCustomers || 0}
            change={stats?.customerChange || 0}
            color="bg-blue-500/20"
          />
          <StatCard
            icon={ShoppingCart}
            label={t('admin.totalOrders') || 'Total Orders'}
            value={stats?.totalOrders || 0}
            change={stats?.orderChange || 0}
            color="bg-green-500/20"
          />
          <StatCard
            icon={DollarSign}
            label={t('admin.totalRevenue') || 'Total Revenue'}
            value={`৳${stats?.totalRevenue || 0}`}
            change={stats?.revenueChange || 0}
            color="bg-purple-500/20"
          />
          <StatCard
            icon={TrendingUp}
            label={t('admin.pendingOrders') || 'Pending Orders'}
            value={stats?.pendingOrders || 0}
            change={stats?.pendingChange || 0}
            color="bg-yellow-500/20"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-1 inline-flex">
          {['overview', 'customers', 'orders', 'payments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' && (t('admin.overview') || 'Overview')}
              {tab === 'customers' && (t('admin.customers.title') || 'Customers')}
              {tab === 'orders' && (t('admin.orders') || 'Orders')}
              {tab === 'payments' && (t('admin.payments') || 'Payments')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('admin.recentActivity') || 'Recent Activity'}</h3>
              <div className="space-y-4">
                {orders.slice(0, 10).map((order: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${
                        order.status === 'completed' ? 'bg-green-500/20' :
                        order.status === 'processing' ? 'bg-yellow-500/20' :
                        'bg-red-500/20'
                      } flex items-center justify-center`}>
                        {order.status === 'completed' ? <CheckCircle className="text-green-400 w-5 h-5" /> :
                         order.status === 'processing' ? <Clock className="text-yellow-400 w-5 h-5" /> :
                         <AlertCircle className="text-red-400 w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{order.customerName}</div>
                        <div className="text-xs text-gray-500">{order.plan} {t('analytics.package')} — {order.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">৳{order.amount}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {order.status === 'completed' ? t('analytics.completed') :
                         order.status === 'processing' ? t('analytics.processing') :
                         t('analytics.cancelled')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{t('admin.customers.title')}</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder={t('admin.customers.search') || 'Search...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 w-48"
                  />
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                  >
                    <option value="all">{t('admin.all') || 'All'}</option>
                    <option value="active">{t('admin.customers.activate') || 'Active'}</option>
                    <option value="inactive">{t('admin.customers.suspend') || 'Inactive'}</option>
                    <option value="new">New</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customers.map((customer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {customer.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">৳{customer.balance || 0}</span>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders & Payments tabs */}
          {activeTab === 'orders' && (
            <div className="p-6 text-center text-gray-400 py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p>{t('admin.ordersData') || 'Order data will appear here'}</p>
            </div>
          )}
          {activeTab === 'payments' && (
            <div className="p-6 text-center text-gray-400 py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p>{t('admin.paymentsData') || 'Payment data will appear here'}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
