interface NotificationsTabProps {
  notifications: {
    emailVideos: boolean
    emailBilling: boolean
    emailMarketing: boolean
    pushNotifications: boolean
  }
  setNotifications: (notifications: Partial<NotificationsTabProps['notifications']>) => void
}

export default function NotificationsTab({ notifications, setNotifications }: NotificationsTabProps) {
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  )

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>

      <Toggle
        checked={notifications.emailVideos}
        onChange={() => setNotifications({ ...notifications, emailVideos: !notifications.emailVideos })}
        label="Email Notifications for Videos"
      />
      <hr className="border-gray-100" />
      <Toggle
        checked={notifications.emailBilling}
        onChange={() => setNotifications({ ...notifications, emailBilling: !notifications.emailBilling })}
        label="Billing Emails"
      />
      <hr className="border-gray-100" />
      <Toggle
        checked={notifications.emailMarketing}
        onChange={() => setNotifications({ ...notifications, emailMarketing: !notifications.emailMarketing })}
        label="Marketing Emails"
      />
      <hr className="border-gray-100" />
      <Toggle
        checked={notifications.pushNotifications}
        onChange={() => setNotifications({ ...notifications, pushNotifications: !notifications.pushNotifications })}
        label="Push Notifications"
      />
    </div>
  )
}
