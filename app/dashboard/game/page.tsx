import GamePage from '@/app/game/page'

export default function DashboardGamePage() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">গেম</h1>
        <a href="/game" className="text-sm text-blue-600 hover:underline">পাবলিক পেজ →</a>
      </div>
      <GamePage />
    </div>
  )
}