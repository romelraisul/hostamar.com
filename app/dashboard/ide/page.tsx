import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import IdeClient from './ide-client'

export const dynamic = 'force-dynamic'

export default async function IdePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return <IdeClient />
}
