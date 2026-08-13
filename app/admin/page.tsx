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

type CreditAccountRow = {
  id: string
  customerId: string
  credits: number
  consumed: number
  videoCredits: number
  imageCredits: number
  chatCredits: number
  browserCredits: number
  ideCredits: number
  gameCredits: number
  hostingCredits: number
  updatedAt?: string
  customer?: { name?: string; email?: string }
}

function AdminCreditsSection({ accounts, stats, onRefresh }: { accounts: CreditAccountRow[]; stats?: any; onRefresh?: () => void }) {
  const [emailQuery, setEmailQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CreditAccountRow[]>([])
  const [searching, setSearching] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<CreditAccountRow | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustProduct, setAdjustProduct] = useState('bonus')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)
  const [adjustError, setAdjustError] = useState('')
  const [adjustSuccess, setAdjustSuccess] = useState('')

  async function runSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const q = emailQuery.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const filtered = accounts.filter((a) => {
        const email = (a.customer?.email || '').toLowerCase()
        const name = (a.customer?.name || '').toLowerCase()
        return email.includes(q) || name.includes(q)
      })
      setSearchResults(filtered)
    } finally {
      setSearching(false)
    }
  }

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustTarget) return
    const amount = parseInt(adjustAmount, 10)
    if (!Number.isInteger(amount) || amount === 0) {
      setAdjustError('Amount must be a non-zero integer (positive to add, negative to deduct).')
      return
    }
    setAdjustSubmitting(true)
    setAdjustError('')
    setAdjustSuccess('')
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: adjustTarget.customerId,
          amount,
          product: adjustProduct,
          description: adjustNote || (amount > 0 ? 'Admin credit adjustment (+)' : 'Admin credit adjustment (-)'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAdjustError(data?.error || `Failed (${res.status})`)
        return
      }
      setAdjustSuccess(data.message || `Account updated. New balance: ${data.account?.credits}`)
      setAdjustAmount('')
      setAdjustNote('')
      onRefresh?.()
    } catch (err: any) {
      setAdjustError(err?.message || 'Network error')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  const productOptions = [
    { value: 'bonus', label: 'Bonus (general)' },
    { value: 'video_wan_5s', label: 'Video (Wan2.1)' },
    { value: 'video_hunyuan_5s', label: 'Video (Hunyuan 1.5 GGUF)' },
    { value: 'image_sd', label: 'Image (SDXL Turbo)' },
    { value: 'image_flux', label: 'Image (Flux)' },
    { value: 'chat_message', label: 'Chat' },
    { value: 'browser_search', label: 'Browser' },
    { value: 'ide_task', label: 'IDE' },
    { value: 'game_spin', label: 'Game' },
    { value: 'hosting_check', label: 'Hosting' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Credit Management</h3>
        <button onClick={onRefresh} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition">Refresh</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-400">Total Customers</div>
            <div className="text-2xl font-bold text-white">{stats.totalCustomers ?? 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-400">Credits Issued</div>
            <div className="text-2xl font-bold text-emerald-300">{stats.totalCreditsIssued?.toLocaleString?.() ?? 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-400">Credits Consumed</div>
            <div className="text-2xl font-bold text-amber-300">{stats.totalCreditsConsumed?.toLocaleString?.() ?? 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-400">Remaining</div>
            <div className="text-2xl font-bold text-blue-300">{((stats.totalCreditsIssued || 0) - (stats.totalCreditsConsumed || 0)).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Search + Adjust */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <form onSubmit={runSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((acc) => (
              <div
                key={acc.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${adjustTarget?.id === acc.id ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:bg-white/10'} cursor-pointer transition`}
                onClick={() => {
                  setAdjustTarget(acc)
                  setAdjustError('')
                  setAdjustSuccess('')
                }}
              >
                <div>
                  <div className="font-medium text-white">{acc.customer?.name || '—'}</div>
                  <div className="text-xs text-gray-400">{acc.customer?.email || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-300">{acc.credits.toLocaleString()} credits</div>
                  <div className="text-xs text-gray-500">Used: {acc.consumed.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {emailQuery && searchResults.length === 0 && !searching && (
          <div className="text-center text-gray-400 py-3 text-sm">No matching accounts.</div>
        )}
      </div>

      {/* Adjustment Form */}
      {adjustTarget && (
        <form onSubmit={submitAdjustment} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              Adjust credits for {adjustTarget.customer?.email || adjustTarget.customer?.name}
            </h4>
            <button
              type="button"
              onClick={() => { setAdjustTarget(null); setAdjustError(''); setAdjustSuccess('') }}
              className="text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Amount (+/-)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 1000 or -500"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Product</label>
              <select
                value={adjustProduct}
                onChange={(e) => setAdjustProduct(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {productOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Note (optional)</label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {adjustError && <div className="text-xs text-red-400">{adjustError}</div>}
          {adjustSuccess && <div className="text-xs text-emerald-400">{adjustSuccess}</div>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={adjustSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {adjustSubmitting ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </form>
      )}

      {/* Customer Credits Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Customer Credits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-gray-300">Customer</th>
                <th className="px-6 py-3 text-gray-300">Balance</th>
                <th className="px-6 py-3 text-gray-300">Consumed</th>
                <th className="px-6 py-3 text-gray-300">Video</th>
                <th className="px-6 py-3 text-gray-300">Image</th>
                <th className="px-6 py-3 text-gray-300">Chat</th>
                <th className="px-6 py-3 text-gray-300">Browser</th>
                <th className="px-6 py-3 text-gray-300">IDE</th>
                <th className="px-6 py-3 text-gray-300">Game</th>
                <th className="px-6 py-3 text-gray-300">Hosting</th>
                <th className="px-6 py-3 text-gray-300">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.map((account: any) => (
                <tr
                  key={account.id}
                  className={`hover:bg-white/5 cursor-pointer ${adjustTarget?.id === account.id ? 'bg-blue-600/10' : ''}`}
                  onClick={() => { setAdjustTarget(account); setAdjustError(''); setAdjustSuccess('') }}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{account.customer?.name || "—"}</div>
                    <div className="text-xs text-gray-400">{account.customer?.email || "—"}</div>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{account.credits.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-300">{account.consumed.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-300">{account.videoCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.imageCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.chatCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.browserCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.ideCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.gameCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-300">{account.hostingCredits ?? 0}</td>
                  <td className="px-6 py-4 text-gray-400">{account.updatedAt ? new Date(account.updatedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {!accounts.length && (<tr><td colSpan={11} className="px-6 py-10 text-center text-gray-400">No credit accounts found.</td></tr>)}
            </tbody>
          </table>
        </div>
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
  const [credits, setCredits] = useState<any[]>([])
  const [creditsStats, setCreditsStats] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchCreditsData()
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
      if (customersData.data) setCustomers(customersData.data)
      else if (customersData.customers) setCustomers(customersData.customers)
      if (ordersData.data) setOrders(ordersData.data)
      else if (ordersData.orders) setOrders(ordersData.orders)
      if (servicesData.data) setServices(servicesData.data)
      else if (servicesData.services) setServices(servicesData.services)
      if (subscriptionsData.data) setSubscriptions(subscriptionsData.data)
      else if (subscriptionsData.subscriptions) setSubscriptions(subscriptionsData.subscriptions)
      if (paymentsData.data) setPayments(paymentsData.data)
      else if (paymentsData.payments) setPayments(paymentsData.payments)
      if (analyticsData.success) setAnalyticsData((analyticsData.data as Analytics) || (analyticsData as Analytics))
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCreditsData = async () => {
    try {
      const [accountsRes, statsRes] = await Promise.all([
        fetch("/api/admin/credits?limit=200", { credentials: "include" }),
        fetch("/api/admin/credits", { credentials: "include" }),
      ])

      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setCredits(Array.isArray(data.accounts) ? data.accounts : [])
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setCreditsStats(data.stats || null)
      }
    } catch (err) {
      console.error("Credits fetch error:", err)
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
          {["overview", "customers", "orders", "payments", "services", "subscriptions", "analytics", "settings", "credits"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
              {tab === "overview" && (t("admin.overview") || "Overview")}
              {tab === "customers" && (t("admin.customers.title") || "Customers")}
              {tab === "orders" && (t("admin.orders") || "Orders")}
              {tab === "payments" && (t("admin.payments") || "Payments")}
              {tab === "services" && "Services"}
              {tab === "subscriptions" && "Subscriptions"}
              {tab === "analytics" && "Analytics"}
              {tab === "settings" && "Settings"}
              {tab === "credits" && "Credits"}
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
          {activeTab === "credits" && <AdminCreditsSection accounts={credits} stats={creditsStats} onRefresh={fetchCreditsData} />}
        </div>
      </section>
    </main>
  )
}
