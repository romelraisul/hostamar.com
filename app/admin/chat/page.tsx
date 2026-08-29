import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import ChatOsClient from './chat-client'

export const dynamic = 'force-dynamic'

export default async function AdminChatPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) redirect('/login')
  const payload = verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
    // also check DB role fallback via email list
    const allowed = ['romelraisul@outlook.com', 'admin@hostamar.com']
    if (!payload || !allowed.includes(payload.email)) redirect('/login')
  }
  return <ChatOsClient user={payload} />
}
