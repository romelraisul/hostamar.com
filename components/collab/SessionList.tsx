import { Users } from 'lucide-react'
import SessionCard from './SessionCard'

interface Session {
  id: string
  code: string
  host: string
  title: string
  createdAt: string
  expiresAt: string
  participants: string[]
  status: string
}

interface SessionListProps {
  loading: boolean
  sessions: Session[]
  onCopy: (code: string) => void
  copied: string | null
  onOpen: (id: string) => void
}

export default function SessionList({ loading, sessions, onCopy, copied, onOpen }: SessionListProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-cyan-400" />
        Active Sessions
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No active sessions</p>
          <p className="text-gray-600 text-sm mt-1">Create a session to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onCopy={onCopy}
              copied={copied}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
