import { Plus, ArrowRight } from 'lucide-react'

interface CreateSessionFormProps {
  show: boolean
  onClose: () => void
  title: string
  onTitleChange: (val: string) => void
  duration: number
  onDurationChange: (val: number) => void
  onSubmit: (e: React.FormEvent) => void
  creating: boolean
}

export default function CreateSessionForm({
  show,
  onClose,
  title,
  onTitleChange,
  duration,
  onDurationChange,
  onSubmit,
  creating,
}: CreateSessionFormProps) {
  if (!show) return null

  return (
    <div className="mb-8 p-6 bg-gray-900/80 border border-cyan-500/20 rounded-2xl backdrop-blur">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-cyan-400" />
        Create New Session
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Session Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g., Fix auth bug, Review PR #42"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Duration</label>
          <select
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition"
          >
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={8}>8 hours</option>
            <option value={24}>24 hours</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-semibold disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Session'}
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
