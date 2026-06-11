'use client'

interface SettingsHeaderProps {
  saved: boolean
}

export default function SettingsHeader({ saved }: SettingsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>
      {saved && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in">
          Settings saved successfully!
        </div>
      )}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  )
}