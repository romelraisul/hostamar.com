import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'analytics')
const PAGEVIEWS_FILE = path.join(DATA_DIR, 'pageviews.json')
const EVENTS_FILE = path.join(DATA_DIR, 'events.json')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir()
    if (!fs.existsSync(filePath)) {
      writeJson(filePath, fallback)
      return fallback
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(filePath: string, data: T) {
  ensureDataDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export interface PageView {
  id: string
  path: string
  title: string
  referrer: string
  userAgent: string
  ip: string
  sessionId: string
  timestamp: string
}

export interface AnalyticsEvent {
  id: string
  name: string
  properties: Record<string, unknown>
  sessionId: string
  timestamp: string
}

export interface Session {
  id: string
  userId: string
  startedAt: string
  lastActive: string
  pageViews: number
  userAgent: string
  ip: string
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function getSessionId(req: { headers: Headers }): string {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/analytics_sid=([^;]+)/)
  return match ? match[1] : generateId()
}

function getClientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim()
    || headers.get('x-real-ip')
    || 'unknown'
}

export function trackPageView(req: { headers: Headers }, body: { path: string; title: string; referrer?: string }) {
  const sessionId = getSessionId(req)
  const ip = getClientIp(req.headers)
  const userAgent = req.headers.get('user-agent') || 'unknown'

  const pageView: PageView = {
    id: generateId(),
    path: body.path,
    title: body.title,
    referrer: body.referrer || '',
    userAgent,
    ip,
    sessionId,
    timestamp: new Date().toISOString(),
  }

  const pageviews = readJson<PageView[]>(PAGEVIEWS_FILE, [])
  pageviews.push(pageView)
  writeJson(PAGEVIEWS_FILE, pageviews.slice(-10000))

  const sessions = readJson<Session[]>(SESSIONS_FILE, [])
  const existingSession = sessions.find(s => s.id === sessionId)
  if (existingSession) {
    existingSession.lastActive = new Date().toISOString()
    existingSession.pageViews += 1
    writeJson(SESSIONS_FILE, sessions)
  } else {
    const session: Session = {
      id: sessionId,
      userId: ip,
      startedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      pageViews: 1,
      userAgent,
      ip,
    }
    sessions.push(session)
    writeJson(SESSIONS_FILE, sessions.slice(-5000))
  }

  return { sessionId, pageViewId: pageView.id }
}

export function trackEvent(req: { headers: Headers }, body: { name: string; properties?: Record<string, unknown> }) {
  const sessionId = getSessionId(req)

  const event: AnalyticsEvent = {
    id: generateId(),
    name: body.name,
    properties: body.properties || {},
    sessionId,
    timestamp: new Date().toISOString(),
  }

  const events = readJson<AnalyticsEvent[]>(EVENTS_FILE, [])
  events.push(event)
  writeJson(EVENTS_FILE, events.slice(-10000))

  return { eventId: event.id }
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= weekAgo
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function getAnalytics() {
  const pageviews = readJson<PageView[]>(PAGEVIEWS_FILE, [])
  const events = readJson<AnalyticsEvent[]>(EVENTS_FILE, [])
  const sessions = readJson<Session[]>(SESSIONS_FILE, [])

  const todayViews = pageviews.filter(pv => isToday(pv.timestamp)).length
  const weekViews = pageviews.filter(pv => isThisWeek(pv.timestamp)).length
  const monthViews = pageviews.filter(pv => isThisMonth(pv.timestamp)).length

  const pageCounts: Record<string, number> = {}
  pageviews.forEach(pv => {
    pageCounts[pv.path] = (pageCounts[pv.path] || 0) + 1
  })
  const topPages = Object.entries(pageCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const uniqueIps = new Set(sessions.map(s => s.ip))
  const todaySessions = sessions.filter(s => isToday(s.startedAt)).length
  const weekSessions = sessions.filter(s => isThisWeek(s.startedAt)).length

  const eventCounts: Record<string, number> = {}
  events.forEach(ev => {
    eventCounts[ev.name] = (eventCounts[ev.name] || 0) + 1
  })

  const recentEvents = events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50)

  const avgSessionDuration = sessions.length > 0
    ? sessions.reduce((acc, s) => {
        const duration = new Date(s.lastActive).getTime() - new Date(s.startedAt).getTime()
        return acc + duration
      }, 0) / sessions.length
    : 0

  return {
    pageViews: {
      total: pageviews.length,
      today: todayViews,
      week: weekViews,
      month: monthViews,
    },
    uniqueVisitors: {
      total: uniqueIps.size,
      today: new Set(sessions.filter(s => isToday(s.startedAt)).map(s => s.ip)).size,
      week: new Set(sessions.filter(s => isThisWeek(s.startedAt)).map(s => s.ip)).size,
    },
    sessions: {
      total: sessions.length,
      today: todaySessions,
      week: weekSessions,
      avgDurationMs: Math.round(avgSessionDuration),
    },
    topPages,
    events: {
      total: events.length,
      byName: eventCounts,
      recent: recentEvents,
    },
  }
}
