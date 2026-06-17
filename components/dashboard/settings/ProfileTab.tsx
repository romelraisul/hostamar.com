import type { Profile } from './types'

interface ProfileTabProps {
  profile: Profile
  setProfile: (profile: Partial<Profile>) => void
}

export default function ProfileTab({ profile, setProfile }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={profile.name}
            onChange={e => setProfile({ ...profile, name: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={profile.email}
            disabled
            className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={profile.phone}
            onChange={e => setProfile({ ...profile, phone: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
