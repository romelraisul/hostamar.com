import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const IDES = [
  { id: 'vscode', name: 'VS Code', icon: '💻', desc: 'সম্পূর্ণ VS Code ব্রাউজারে', price: 10 },
  { id: 'pycharm', name: 'PyCharm', icon: '🐍', desc: 'Python IDE', price: 15 },
  { id: 'jupyter', name: 'Jupyter', icon: '📊', desc: 'ডাটা সায়েন্স নোটবুক', price: 12 },
]

export default async function IdePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ব্রাউজার IDE 💻</h1>
          <p className="mt-1 text-sm text-zinc-500">VS Code, PyCharm — ব্রাউজারে কোড করুন, ডাউনলোড করার দরকার নেই</p>
        </div>
        <a href="/dashboard/services/new?type=ide" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ নতুন IDE</a>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {IDES.map(ide => (
          <div key={ide.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{ide.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold">{ide.name}</h3>
                <p className="text-xs text-zinc-500">{ide.desc}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#0E7C3A]">{ide.price}cr/ঘণ্টা</span>
              <button className="rounded-lg bg-[#0E7C3A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0c6a32]">শুরু করুন</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border bg-[#F8FAFC] p-4 text-xs text-zinc-500">
        💡 ফাইল সেভ হয় B2 স্টোরেজে (s3.us-east-005) • ২৪/৭ অ্যাক্সেস • ৬০০০ credits দিয়ে শুরু করুন
      </div>
    </div>
  )
}
