const tabs = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'password', label: 'Password', icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
]

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <nav className="lg:w-56">
      <ul className="space-y-1">
        {tabs.map(tab => (
          <li key={tab.id}>
            <button
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
