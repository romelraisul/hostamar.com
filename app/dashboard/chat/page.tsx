import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import ChatClient from './chat-client'

export const dynamic = 'force-dynamic'

/**
 * /dashboard/chat — clean ChatGPT-style layout (models sidebar | chat | settings).
 * Middleware also guards /dashboard/*, this is a second server-side check.
 */
export default async function ChatPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return <ChatClient />
}
