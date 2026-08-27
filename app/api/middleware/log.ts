
import { NextRequest } from 'next/server'
import { logApiRequest } from '@/lib/logger'

export function logRequest(req: NextRequest, status: number, duration: number, keyId?: string | null) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || req.ip || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const path = new URL(req.url).pathname
  const method = req.method
  // fire and forget
  logApiRequest({ keyId: keyId || null, ip, ua, path, method, status, duration }).catch(()=>{})
  // also file log for /v1/*
  if (path.startsWith('/v1/') || path.startsWith('/api/')) {
    try {
      const fs = require('fs')
      const pathMod = require('path')
      const logFile = pathMod.join(process.cwd(), 'logs', 'api-abuse.log')
      const line = `${new Date().toISOString()} ${ip} ${method} ${path} ${status} ${ua}\n`
      fs.appendFileSync(logFile, line)
    } catch {}
  }
}
