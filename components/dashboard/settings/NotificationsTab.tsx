'use client'

interface Notifications {
  emailVideos: boolean
  emailBilling: boolean
  emailMarketing: boolean
  pushNotifications: boolean
}

interface Props {
  notifications: Notifications
  setNotifications: (n: Notifications) => void
}

export default function NotificationsTab({ notifications, setNotifications }: Props) {
  function toggle(field: keyof Notifications) {
    setNotifications({ ...notifications, [field]: !notifications[field] })
  }

  const items = [
    { key: 'emailVideos' as const, label: 'Video updates', desc: 'Get emails when your videos are ready' },
    { key: 'emailBilling' as const, label: 'Billing', desc: 'Receipts and payment confirmations' },
    { key: 'emailMarketing' as const, label: 'Marketing', desc: 'Tips, product updates, and offers' },
    { key: 'pushNotifications' as const, label: 'Push notifications', desc: 'Browser notifications for important updates' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={notifications[item.key]}
              onChange={() => toggle(item.key)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
