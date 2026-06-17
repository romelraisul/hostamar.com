import fs from 'fs'
import path from 'path'

const COLLAB_FILE = path.join(process.cwd(), 'data', 'collab-sessions.json')

export interface CollabSession {
  id: string
  code: string
  host: string
  title: string
  createdAt: string
  expiresAt: string
  participants: string[]
  status: 'active' | 'expired'
}

function ensureFile() {
  const dir = path.dirname(COLLAB_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(COLLAB_FILE)) {
    fs.writeFileSync(COLLAB_FILE, JSON.stringify([]))
  }
}

function readSessions(): CollabSession[] {
  ensureFile()
  const data = fs.readFileSync(COLLAB_FILE, 'utf-8')
  return JSON.parse(data)
}

function writeSessions(sessions: CollabSession[]) {
  ensureFile()
  fs.writeFileSync(COLLAB_FILE, JSON.stringify(sessions, null, 2))
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function expireOldSessions() {
  const sessions = readSessions()
  const now = new Date()
  let changed = false

  sessions.forEach(session => {
    if (session.status === 'active' && new Date(session.expiresAt) < now) {
      session.status = 'expired'
      changed = true
    }
  })

  if (changed) {
    writeSessions(sessions)
  }
}

export function createSession(host: string, title: string, durationHours: number = 2): CollabSession {
  expireOldSessions()

  const session: CollabSession = {
    id: crypto.randomUUID(),
    code: generateCode(),
    host,
    title,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    participants: [host],
    status: 'active',
  }

  const sessions = readSessions()
  sessions.push(session)
  writeSessions(sessions)

  return session
}

export function joinSession(code: string, userId: string): CollabSession | null {
  expireOldSessions()

  const sessions = readSessions()
  const session = sessions.find(s => s.code === code && s.status === 'active')

  if (!session) {
    return null
  }

  if (!session.participants.includes(userId)) {
    session.participants.push(userId)
  }

  writeSessions(sessions)
  return session
}

export function getActiveSessions(): CollabSession[] {
  expireOldSessions()
  return readSessions().filter(s => s.status === 'active')
}

export function getSessionByCode(code: string): CollabSession | null {
  expireOldSessions()
  return readSessions().find(s => s.code === code) || null
}

export function getSessionById(id: string): CollabSession | null {
  return readSessions().find(s => s.id === id) || null
}
