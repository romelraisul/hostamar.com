import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import GameClient from './game-client'

export const dynamic = 'force-dynamic'

export default async function GamePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return <GameClient />
}
