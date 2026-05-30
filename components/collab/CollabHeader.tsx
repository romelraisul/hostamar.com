import { Sparkles } from 'lucide-react'

interface CollabHeaderProps {
  user: { id: string; name: string; email: string } | null
}

export default function CollabHeader({ user }: CollabHeaderProps) {
  return (
    <header className="container mx-auto px-4 py-6">
      <nav className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hostamar
          </a>
          <span className="text-gray-600">/</span>
          <span className="text-xl font-semibold text-cyan-400">Collab</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dev/" className="text-gray-400 hover:text-white transition text-sm">
            Dev IDE
          </a>
          <div className="text-sm text-gray-400">
            {user?.name || user?.email}
          </div>
        </div>
      </nav>
    </header>
  )
}
