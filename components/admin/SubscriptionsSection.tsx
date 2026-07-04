type Subscription = {
  id: string
  plan?: string
  status?: string
  price?: number
  nextBillingDate?: string
  customer?: { name?: string; email?: string }
}

type StatusBadgeProps = { status?: string }

function StatusBadge({ status }: StatusBadgeProps) {
  const cls = status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{status || 'unknown'}</span>
}

export default function SubscriptionsSection({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.status === 'active').length
  const inactive = subscriptions.length - active
  const revenue = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stats label="Subscriptions" value={subscriptions.length} />
        <Stats label="Active" value={active} />
        <Stats label="Inactive" value={inactive} />
        <Stats label="Revenue" value={`৳${revenue.toLocaleString()}`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-gray-300 font-medium">Customer</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Plan</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Price</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Next Billing</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{sub.customer?.name || '—'}</div>
                    <div className="text-xs text-gray-400">{sub.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 capitalize text-white">{sub.plan?.toLowerCase() || '—'}</td>
                  <td className="px-6 py-4 text-white">{sub.price !== undefined ? `৳${sub.price.toLocaleString()}` : '—'}</td>
                  <td className="px-6 py-4 text-gray-300">{sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={sub.status} /></td>
                </tr>
              ))}
              {!subscriptions.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No subscriptions found.
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
