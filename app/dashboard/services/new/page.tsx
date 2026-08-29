import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getAuthUser } from '@/lib/auth'
import NewServiceForm from './new-service-form'

export const dynamic = 'force-dynamic'

export default async function ServicesNewPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">লোড হচ্ছে...</div>}>
      <NewServiceForm />
    </Suspense>
  )
}
