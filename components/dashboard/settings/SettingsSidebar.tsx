'use client'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'business', label: 'Business' },
  { id: 'password', label: 'Password' },
  { id: 'security', label: 'Security / MFA' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'models', label: 'Models' },
  { id: 'keys', label: 'API Keys' },
]

export default function SettingsSidebar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="flex lg:flex-col gap-1 lg:w-48">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-[#0E7C3A]/10 text-[#0A5A2B]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
