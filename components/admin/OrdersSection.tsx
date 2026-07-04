type Order = {
  id: string
  plan?: string
  amount?: number
  status?: string
  currency?: string
  createdAt?: string
  customer?: { name?: string; email?: string }
}

type StatusBadgeProps = { status?: string }

function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === 'completed'
      ? 'bg-emerald-500/20 text-emerald-300'
      : status === 'processing'
        ? 'bg-amber-500/20 text-amber-300'
        : 'bg-red-500/20 text-red-300'
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{status || 'unknown'}</span>
}

function fmtCurrency(amount?: number, currency = 'BDT') {
  if (!amount && amount !== 0) return '—'
  return currency === 'BDT' ? `৳${amount.toLocaleString()}` : `${amount} ${currency}`
}

export default function OrdersSection({ orders }: { orders: Order[] }) {
  const completed = orders.filter((o) => o.status === 'completed').length
  const revenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const pending = orders.length - completed

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stats label="Orders" value={orders.length} />
        <Stats label="Completed" value={completed} />
        <Stats label="Pending" value={pending} />
        <Stats label="Revenue" value={`৳${revenue.toLocaleString()}`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-gray-300 font-medium">Customer</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Plan</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Amount</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Status</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{order.customer?.name || '—'}</div>
                    <div className="text-xs text-gray-400">{order.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-white">{order.plan?.toLowerCase() || '—'}</td>
                  <td className="px-6 py-4 text-white">{fmtCurrency(order.amount, order.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4 text-gray-300">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stats({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}
