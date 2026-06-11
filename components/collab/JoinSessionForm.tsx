import { Code2, ArrowRight } from 'lucide-react'

interface JoinSessionFormProps {
  show: boolean
  onClose: () => void
  joinCode: string
  onJoinCodeChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  joining: boolean
}

export default function JoinSessionForm({
  show,
  onClose,
  joinCode,
  onJoinCodeChange,
  onSubmit,
  joining,
}: JoinSessionFormProps) {
  if (!show) return null

  return (
    <div className="mb-8 p-6 bg-gray-900/80 border border-purple-500/20 rounded-2xl backdrop-blur">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Code2 className="w-5 h-5 text-purple-400" />
        Join Session
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Session Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
            placeholder="Enter 8-character code"
            maxLength={8}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition font-mono text-lg tracking-widest text-center uppercase"
            required
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={joining}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Session'}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
