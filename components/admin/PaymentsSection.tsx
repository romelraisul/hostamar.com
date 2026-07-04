type Payment = {
  id: string
  method?: string
  amount?: number
  currency?: string
  status?: string
  transactionId?: string
  createdAt?: string
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

export default function PaymentsSection({ payments }: { payments: Payment[] }) {
  const completed = payments.filter((p) => p.status === 'completed').length
  const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const pending = payments.length - completed

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stats label="Payments" value={payments.length} />
        <Stats label="Completed" value={completed} />
        <Stats label="Pending" value={pending} />
        <Stats label="Revenue" value={`৳${revenue.toLocaleString()}`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-gray-300 font-medium">Transaction</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Method</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Amount</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Status</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 text-white">{payment.transactionId || '—'}</td>
                  <td className="px-6 py-4 capitalize text-white">{payment.method?.toLowerCase() || '—'}</td>
                  <td className="px-6 py-4 text-white">{fmtCurrency(payment.amount, payment.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={payment.status} /></td>
                  <td className="px-6 py-4 text-gray-300">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!payments.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No payments found.
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
