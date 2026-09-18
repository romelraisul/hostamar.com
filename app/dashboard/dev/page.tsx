import DevPage from '@/app/dev/page'

export default function DashboardDevPage() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">ডেভ আইডিই</h1>
        <a href="/dev" className="text-sm text-blue-600 hover:underline">পাবলিক পেজ →</a>
      </div>
      <DevPage />
    </div>
  )
}