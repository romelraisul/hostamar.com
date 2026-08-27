'use client'

import { useRouter } from 'next/navigation'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'business', label: 'Business' },
  { id: 'password', label: 'Password' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'api-keys', label: 'API Keys' },
]

export default function SettingsSidebar({ activeTab, onTabChange }: Props) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="flex lg:flex-col gap-1 lg:w-48">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}

      <button
        onClick={handleLogout}
        className="text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors lg:mt-4"
      >
        Logout
      </button>
    </nav>
  )
}
