import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const GAMES = [
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️', ram: '2GB', cpu: '1 vCPU', price: 20, status: 'stopped' },
  { id: 'cs2', name: 'CS2', icon: '🔫', ram: '4GB', cpu: '2 vCPU', price: 40, status: 'stopped' },
  { id: 'valorant', name: 'Valorant', icon: '🎯', ram: '4GB', cpu: '2 vCPU', price: 50, status: 'stopped' },
  { id: 'gta5', name: 'GTA V', icon: '🚗', ram: '8GB', cpu: '4 vCPU', price: 80, status: 'stopped' },
]

export default async function GamePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">গেম হোস্টিং 🎮</h1>
          <p className="mt-1 text-sm text-zinc-500">Minecraft, CS2, Valorant — আপনার সার্ভার ২৪/৭ অনলাইন</p>
        </div>
        <a href="/dashboard/services/new?type=game" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ নতুন সার্ভার</a>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAMES.map(g => (
          <div key={g.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold">{g.name}</h3>
                <p className="text-xs text-zinc-500">{g.ram} RAM • {g.cpu}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">{g.price}cr/ঘণ্টা</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button className="flex-1 rounded-lg bg-[#0E7C3A] py-2 text-sm font-medium text-white hover:bg-[#0c6a32]">স্টার্ট</button>
              <button className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-zinc-50">স্টপ</button>
              <button className="rounded-lg border p-2 hover:bg-zinc-50" title="B2 ব্যাকআপ">💾</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border bg-[#F8FAFC] p-4 text-xs text-zinc-500">
        💡 ব্যাকআপ B2 স্টোরেজে (s3.us-east-005) সংরক্ষিত হয় • প্রতি ৬ ঘণ্টায় অটো ব্যাকআপ • ৬০০০ credits দিয়ে শুরু করুন
      </div>
    </div>
  )
}
