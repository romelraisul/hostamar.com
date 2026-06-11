import { Plus, Code2 } from 'lucide-react'

interface CollabActionsProps {
  onShowCreate: () => void
  onShowJoin: () => void
}

export default function CollabActions({ onShowCreate, onShowJoin }: CollabActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <button
        onClick={onShowCreate}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-semibold"
      >
        <Plus className="w-5 h-5" />
        Create Session
      </button>
      <button
        onClick={onShowJoin}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition border border-white/10 font-semibold"
      >
        <Code2 className="w-5 h-5" />
        Join with Code
      </button>
    </div>
  )
}
