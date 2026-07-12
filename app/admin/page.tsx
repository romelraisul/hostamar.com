"use client"
export const dynamic = 'force-dynamic'
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
  RefreshCw,
  MoreVertical,
} from "lucide-react"
import { useLocale } from "@/lib/locale-context"

type Order = {
  id: string
  customerName?: string
  plan?: string
  amount?: number
  status?: string
  date?: string
  currency?: string
  customer?: { name?: string; email?: string }
}
type Customer = { id?: string; name?: string; email?: string; status?: string; balance?: number }
type Payment = { id: string; method?: string; amount?: number; currency?: string; status?: string; transactionId?: string; createdAt?: string }
type Service = { id: string; name?: string; type?: string; status?: string; customer?: { name?: string; email?: string } }
type Subscription = { id: string; plan?: string; status?: string; price?: number; nextBillingDate?: string; customer?: { name?: string; email?: string } }
type Analytics = { revenue?: number; pageViews?: number; signups?: number; conversionRate?: number }

function StatusBadge({ status, activeText, inactiveText }: { status?: string; activeText?: string; inactiveText?: string }) {
  if (status === "completed" || status === "active") {
    return <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">{status}{activeText ? ` ${activeText}` : ""}</span>
  }
  if (status === "processing" || status === "pending") {
    return <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-300">{status}{activeText ? ` ${activeText}` : ""}</span>
  }
  return <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">{status}{inactiveText ? ` ${inactiveText}` : ""}</span>
}

function StatCards({ stats, orders, services, subscriptions }: { stats: any; orders: Order[]; services: Service[]; subscriptions: Subscription[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{stats?.totalCustomers || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Total Customers</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{stats?.totalOrders || orders.length}</div>
        <div className="text-sm text-gray-400 mt-1">Total Orders</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{stats?.totalRevenue || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Total Revenue</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{stats?.pendingOrders || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Pending Orders</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{services.length || stats?.activeServices || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Active Services</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{subscriptions.length || stats?.activeSubscriptions || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Subscriptions</div>
      </div>
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 md:col-span-2">
        <div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div></div>
        <div className="text-3xl font-bold text-white">{stats?.totalRevenue || 0}</div>
        <div className="text-sm text-gray-400 mt-1">Revenue</div>
      </div>
    </div>
  )
}

function AdminOrdersSection({ orders }: { orders: Order[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Orders</div><div className="text-2xl font-semibold text-white">{orders.length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Completed</div><div className="text-2xl font-semibold text-white">{orders.filter((o) => o.status === "completed").length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Revenue</div><div className="text-2xl font-semibold text-white">{orders.reduce((sum, o) => sum + (o.amount || 0), 0)}</div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Orders</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10"><tr><th className="px-6 py-3 text-gray-300">Customer</th><th className="px-6 py-3 text-gray-300">Plan</th><th className="px-6 py-3 text-gray-300">Amount</th><th className="px-6 py-3 text-gray-300">Status</th><th className="px-6 py-3 text-gray-300">Date</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/5">
                <td className="px-6 py-4"><div className="font-medium text-white">{order.customer?.name || "—"}</div><div className="text-xs text-gray-400">{order.customer?.email || "—"}</div></td>
                <td className="px-6 py-4 text-white">{order.plan?.toLowerCase() || "—"}</td>
                <td className="px-6 py-4 text-white">{order.amount || 0}</td>
                <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                <td className="px-6 py-4 text-gray-300">{order.date ? new Date(order.date).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!orders.length && (<tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No orders found.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminPaymentsSection({ payments }: { payments: Payment[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Payments</div><div className="text-2xl font-semibold text-white">{payments.length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Completed</div><div className="text-2xl font-semibold text-white">{payments.filter((p) => p.status === "completed").length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Revenue</div><div className="text-2xl font-semibold text-white">{payments.reduce((sum, p) => sum + (p.amount || 0), 0)}</div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Payments</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10"><tr><th className="px-6 py-3 text-gray-300">Txn</th><th className="px-6 py-3 text-gray-300">Method</th><th className="px-6 py-3 text-gray-300">Amount</th><th className="px-6 py-3 text-gray-300">Status</th><th className="px-6 py-3 text-gray-300">Date</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-white/5">
                <td className="px-6 py-4 text-white">{payment.transactionId || "—"}</td>
                <td className="px-6 py-4 capitalize text-white">{payment.method?.toLowerCase() || "—"}</td>
                <td className="px-6 py-4 text-white">{payment.amount || 0}</td>
                <td className="px-6 py-4"><StatusBadge status={payment.status} /></td>
                <td className="px-6 py-4 text-gray-300">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!payments.length && (<tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No payments found.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminServicesSection({ services }: { services: Service[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Services</div><div className="text-2xl font-semibold text-white">{services.length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Active</div><div className="text-2xl font-semibold text-white">{services.filter((s) => s.status === "active").length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Inactive</div><div className="text-2xl font-semibold text-white">{services.filter((s) => s.status !== "active").length}</div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Services</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10"><tr><th className="px-6 py-3 text-gray-300">Customer</th><th className="px-6 py-3 text-gray-300">Service</th><th className="px-6 py-3 text-gray-300">Status</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-white/5">
                <td className="px-6 py-4"><div className="font-medium text-white">{service.customer?.name || "—"}</div><div className="text-xs text-gray-400">{service.customer?.email || "—"}</div></td>
                <td className="px-6 py-4 text-white">{service.name || "—"}<div className="text-xs text-gray-400">{service.type}</div></td>
                <td className="px-6 py-4"><StatusBadge status={service.status} activeText="active" inactiveText="inactive" /></td>
              </tr>
            ))}
            {!services.length && (<tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">No services found.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminSubscriptionsSection({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Subscriptions</div><div className="text-2xl font-semibold text-white">{subscriptions.length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Active</div><div className="text-2xl font-semibold text-white">{subscriptions.filter((s) => s.status === "active").length}</div></div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4"><div className="text-sm text-gray-400">Revenue</div><div className="text-2xl font-semibold text-white">{subscriptions.reduce((sum, s) => sum + (s.price || 0), 0)}</div></div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Subscriptions</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10"><tr><th className="px-6 py-3 text-gray-300">Customer</th><th className="px-6 py-3 text-gray-300">Plan</th><th className="px-6 py-3 text-gray-300">Price</th><th className="px-6 py-3 text-gray-300">Next Billing</th><th className="px-6 py-3 text-gray-300">Status</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-white/5">
                <td className="px-6 py-4"><div className="font-medium text-white">{sub.customer?.name || "—"}</div><div className="text-xs text-gray-400">{sub.customer?.email || "—"}</div></td>
                <td className="px-6 py-4 text-white">{sub.plan?.toLowerCase() || "—"}</td>
                <td className="px-6 py-4 text-white">{sub.price !== undefined ? `${sub.price.toLocaleString()}` : "—"}</td>
                <td className="px-6 py-4 text-gray-300">{sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : "—"}</td>
                <td className="px-6 py-4"><StatusBadge status={sub.status} activeText="active" inactiveText="inactive" /></td>
              </tr>
            ))}
            {!subscriptions.length && (<tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No subscriptions found.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminAnalyticsSection({ analytics }: { analytics?: Analytics }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
        <p className="text-slate-300 text-sm">{analytics ? "Analytics data loaded from /api/analytics." : "No analytics data available yet."}</p>
        <pre className="mt-3 text-xs text-slate-400 bg-black/20 p-3 rounded-lg overflow-auto">{JSON.stringify(analytics, null, 2)}</pre>
      </div>
    </div>
  )
}

function AdminSettingsSection() {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
        <p className="text-slate-300 text-sm">Admin settings placeholder. Connect this to a settings API route.</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useLocale()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<Analytics | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, customersRes, ordersRes, servicesRes, subscriptionsRes, paymentsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/admin/customers?limit=50", { credentials: "include" }),
        fetch("/api/admin/orders?limit=100", { credentials: "include" }),
        fetch("/api/admin/services?limit=100", { credentials: "include" }),
        fetch("/api/admin/subscriptions?limit=100", { credentials: "include" }),
        fetch("/api/admin/payments?limit=100", { credentials: "include" }),
        fetch("/api/analytics?limit=100", { credentials: "include" }),
      ])
      const statsData = await statsRes.json()
      const customersData = await customersRes.json()
      const ordersData = await ordersRes.json()
      const servicesData = await servicesRes.json()
      const subscriptionsData = await subscriptionsRes.json()
      const paymentsData = await paymentsRes.json()
      const analyticsData = await analyticsRes.json()
      if (statsData.success) setStats(statsData.data)
      if (customersData.success) setCustomers(customersData.data)
      if (ordersData.success) setOrders(ordersData.data)
      if (servicesData.success) setServices(servicesData.services || servicesData.data || [])
      if (subscriptionsData.success) setSubscriptions(subscriptionsData.subscriptions || subscriptionsData.data || [])
      if (paymentsData.success) setPayments(paymentsData.payments || paymentsData.data || [])
      if (analyticsData.success) setAnalyticsData((analyticsData.data as Analytics) || (analyticsData as Analytics))
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">{t("logs.loading")}</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"><Eye className="text-white w-5 h-5" /></div>
            <span className="text-xl font-bold text-white tracking-tight">{t("admin.title") || "Admin Dashboard"}</span>
          </div>
          <button onClick={() => fetchDashboardData()} className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"><RefreshCw className="w-5 h-5" /></button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{t("admin.welcome") || "Welcome, Admin!"}</h1>
              <p className="text-gray-400 mt-1">{t("admin.welcomeDesc") || "View your platform overview"}</p>
            </div>
            <div className="text-right"><div className="text-sm text-gray-400">{t("admin.today") || "Today's Date"}</div><div className="text-lg font-bold text-white">{new Date().toLocaleDateString("en-US")}</div></div>
          </div>
        </div>

        <StatCards stats={stats} orders={orders} services={services} subscriptions={subscriptions} />

        <div className="flex gap-2 mb-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-1 inline-flex flex-wrap">
          {["overview", "customers", "orders", "payments", "services", "subscriptions", "analytics", "settings"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
              {tab === "overview" && (t("admin.overview") || "Overview")}
              {tab === "customers" && (t("admin.customers.title") || "Customers")}
              {tab === "orders" && (t("admin.orders") || "Orders")}
              {tab === "payments" && (t("admin.payments") || "Payments")}
              {tab === "services" && "Services"}
              {tab === "subscriptions" && "Subscriptions"}
              {tab === "analytics" && "Analytics"}
              {tab === "settings" && "Settings"}
            </button>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          {activeTab === "overview" && (
            <div className="p-6 space-y-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">{t("admin.recentActivity") || "Recent Activity"}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-400">Customers</div><div className="text-sm font-semibold text-white">{stats?.totalCustomers || 0}</div></div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-400">Orders</div><div className="text-sm font-semibold text-white">{stats?.totalOrders || orders.length}</div></div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-400">Revenue</div><div className="text-sm font-semibold text-white">{stats?.totalRevenue || 0}</div></div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-400">Pending</div><div className="text-sm font-semibold text-white">{stats?.pendingOrders || 0}</div></div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-400">Services</div><div className="text-sm font-semibold text-white">{services.length || stats?.activeServices || 0}</div></div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Recent Orders</h3></div>
                <div className="divide-y divide-white/5">
                  {orders.slice(0, 10).map((order, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${order.status === "completed" ? "bg-green-500/20" : "bg-yellow-500/20"} flex items-center justify-center`}>{order.status === "completed" ? <CheckCircle className="text-green-400 w-5 h-5" /> : <Clock className="text-yellow-400 w-5 h-5" />}</div>
                        <div><div className="text-sm font-medium text-white">{order.customer?.name || order.customerName || "—"}</div><div className="text-xs text-gray-500">{order.plan?.toLowerCase()} package</div></div>
                      </div>
                      <div className="text-right"><div className="text-sm font-bold text-white">{order.amount || 0}</div><span className={`text-xs px-2 py-1 rounded-full ${order.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{order.status || "processing"}</span></div>
                    </div>
                  ))}
                  {!orders.length && (<div className="p-6 text-center text-gray-400">No recent orders.</div>)}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5"><h3 className="text-lg font-semibold text-white">Recent Customers</h3></div>
                <div className="divide-y divide-white/5">
                  {customers.slice(0, 10).map((customer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">{(customer.name?.[0] || "?").toUpperCase()}</div><div><div className="text-sm font-medium text-white">{customer.name}</div><div className="text-xs text-gray-500">{customer.email}</div></div></div>
                      <StatusBadge status={customer.status} />
                    </div>
                  ))}
                  {!customers.length && (<div className="p-6 text-center text-gray-400">No recent customers.</div>)}
                </div>
              </div>
            </div>
          )}
          {activeTab === "customers" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-white">{t("admin.customers.title")}</h3></div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customers.map((customer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">{(customer.name?.[0] || "?").toUpperCase()}</div><div><div className="text-sm font-medium text-white">{customer.name}</div><div className="text-xs text-gray-500">{customer.email}</div></div></div>
                    <div className="flex items-center gap-3"><span className="text-sm text-gray-400">{customer.balance || 0}</span><button className="p-2 hover:bg-white/10 rounded-lg transition"><MoreVertical className="w-4 h-4 text-gray-500" /></button></div>
                  </div>
                ))}
                {!customers.length && (<div className="text-center text-gray-400 py-8">No customers found.</div>)}
              </div>
            </div>
          )}
          {activeTab === "orders" && <AdminOrdersSection orders={orders} />}
          {activeTab === "payments" && <AdminPaymentsSection payments={payments} />}
          {activeTab === "services" && <AdminServicesSection services={services} />}
          {activeTab === "subscriptions" && <AdminSubscriptionsSection subscriptions={subscriptions} />}
          {activeTab === "analytics" && <AdminAnalyticsSection analytics={analyticsData} />}
          {activeTab === "settings" && <AdminSettingsSection />}
        </div>
      </section>
    </main>
  )
}
