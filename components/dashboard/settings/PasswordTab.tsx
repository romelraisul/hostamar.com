'use client'

interface Passwords {
  current: string
  new: string
  confirm: string
}

interface Props {
  passwords: Passwords
  setPasswords: (p: Passwords) => void
}

export default function PasswordTab({ passwords, setPasswords }: Props) {
  function update(field: keyof Passwords, value: string) {
    setPasswords({ ...passwords, [field]: value })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={passwords.current}
            onChange={(e) => update('current', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={passwords.new}
            onChange={(e) => update('new', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={passwords.confirm}
            onChange={(e) => update('confirm', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
