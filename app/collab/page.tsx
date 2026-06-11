'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CollabHeader from '@/components/collab/CollabHeader'
import CollabHero from '@/components/collab/CollabHero'
import CollabActions from '@/components/collab/CollabActions'
import MessageBanner from '@/components/collab/MessageBanner'
import CreateSessionForm from '@/components/collab/CreateSessionForm'
import JoinSessionForm from '@/components/collab/JoinSessionForm'
import SessionList from '@/components/collab/SessionList'
import CollabFooter from '@/components/collab/CollabFooter'

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

export default function CollabPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(2)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.id, name: payload.name, email: payload.email })
    } catch {
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    loadSessions()
  }, [router])

  const getToken = () => localStorage.getItem('token')

  async function loadSessions() {
    try {
      const res = await fetch('/api/collab/sessions', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setCreating(true)

    try {
      const res = await fetch('/api/collab/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, durationHours: duration }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create session')
        return
      }

      setSuccess(`Session created! Share code: ${data.session.code}`)
      setShowCreate(false)
      setTitle('')
      setDuration(2)
      loadSessions()
    } catch {
      setError('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setJoining(true)

    try {
      const res = await fetch('/api/collab/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ code: joinCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join session')
        return
      }

      setSuccess(`Joined session: ${data.session.title}`)
      setShowJoin(false)
      setJoinCode('')
      loadSessions()
    } catch {
      setError('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <CollabHeader user={user} />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <CollabHero />

        <CollabActions
          onShowCreate={() => { setShowCreate(true); setShowJoin(false); setError(''); setSuccess(''); }}
          onShowJoin={() => { setShowJoin(true); setShowCreate(false); setError(''); setSuccess(''); }}
        />

        <MessageBanner error={error} success={success} />

        <CreateSessionForm
          show={showCreate}
          onClose={() => setShowCreate(false)}
          title={title}
          onTitleChange={setTitle}
          duration={duration}
          onDurationChange={setDuration}
          onSubmit={handleCreate}
          creating={creating}
        />

        <JoinSessionForm
          show={showJoin}
          onClose={() => setShowJoin(false)}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          onSubmit={handleJoin}
          joining={joining}
        />

        <SessionList
          loading={loading}
          sessions={sessions}
          onCopy={copyCode}
          copied={copied}
          onOpen={(id) => router.push(`/dev/?collab=${id}`)}
        />
      </main>

      <CollabFooter />
    </div>
  )
}
