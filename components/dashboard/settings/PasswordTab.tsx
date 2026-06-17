interface PasswordTabProps {
  passwords: { current: string; new: string; confirm: string }
  setPasswords: (passwords: Partial<{ current: string; new: string; confirm: string }>) => void
}

export default function PasswordTab({ passwords, setPasswords }: PasswordTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="current" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <input
            type="password"
            id="current"
            value={passwords.current}
            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="newPass" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            type="password"
            id="newPass"
            value={passwords.new}
            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label htmlFor="confirmPass" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPass"
            value={passwords.confirm}
            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
