type Service = {
  id: string
  name?: string
  type?: string
  status?: string
  price?: number
  customer?: { name?: string; email?: string }
}

type StatusBadgeProps = { status?: string }

function StatusBadge({ status }: StatusBadgeProps) {
  const cls = status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{status || 'unknown'}</span>
}

export default function ServicesSection({ services }: { services: Service[] }) {
  const active = services.filter((s) => s.status === 'active').length
  const inactive = services.length - active

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stats label="Services" value={services.length} />
        <Stats label="Active" value={active} />
        <Stats label="Inactive" value={inactive} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Services</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-gray-300 font-medium">Customer</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Service</th>
                <th className="px-6 py-3 text-gray-300 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{service.customer?.name || '—'}</div>
                    <div className="text-xs text-gray-400">{service.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-white">
                    {service.name || 'Unnamed service'}
                    <div className="text-xs text-gray-400">{service.type}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={service.status} /></td>
                </tr>
              ))}
              {!services.length ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                    No services found.
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
