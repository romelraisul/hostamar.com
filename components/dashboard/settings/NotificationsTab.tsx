'use client'

interface Notifications {
  emailVideos: boolean
  emailBilling: boolean
  emailMarketing: boolean
  pushNotifications: boolean
}

interface NotificationsTabProps {
  notifications: Notifications
  setNotifications: React.Dispatch<React.SetStateAction<Notifications>>
}

export default function NotificationsTab({ notifications, setNotifications }: NotificationsTabProps) {
  const toggles = [
    { key: 'emailVideos', label: 'Video generation notifications', desc: 'Get notified when your videos are ready' },
    { key: 'emailBilling', label: 'Billing & invoice emails', desc: 'Receive invoices and payment confirmations' },
    { key: 'emailMarketing', label: 'Marketing emails', desc: 'Product updates and tips (optional)' },
    { key: 'pushNotifications', label: 'Push notifications', desc: 'Browser notifications for important updates' },
  ] as const

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
      <div className="space-y-4">
        {toggles.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <p className="text-sm text-gray-500 mt-1">{desc}</p>
            </div>
            <input
              type="checkbox"
              checked={notifications[key]}
              onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  )
}