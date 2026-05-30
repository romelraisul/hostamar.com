'use client'

import { Copy, Check, Users, Clock } from 'lucide-react'

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

interface SessionCardProps {
  session: Session
  onCopy: (code: string) => void
  copied: string | null
  onOpen: (id: string) => void
}

function getExpirationText(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m remaining`
}

export default function SessionCard({ session, onCopy, copied, onOpen }: SessionCardProps) {
  return (
    <div className="p-5 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-cyan-500/30 transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{session.title}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {getExpirationText(session.expiresAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg font-mono text-sm">
            <span className="text-cyan-400">{session.code}</span>
            <button
              onClick={() => onCopy(session.code)}
              className="text-gray-500 hover:text-white transition"
              title="Copy code"
            >
              {copied === session.code ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            onClick={() => onOpen(session.id)}
            className="px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition text-sm font-semibold"
          >
            Open IDE
          </button>
        </div>
      </div>
    </div>
  )
}
