import { prisma } from '@/lib/prisma'
import SamlConfigForm from '@/components/sso/SamlConfigForm'

export const dynamic = 'force-dynamic'

// Server component: load the first org (or none) and render the config form.
export default async function AdminSsoPage() {
  const orgs = await prisma.organization.findMany({
    include: { samlConnection: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })
  const org = orgs[0]
  const initial = org
  ? { org, conn: org.samlConnection || null }
  : undefined

  return (
    <div className="py-8">
      <SamlConfigForm initial={initial} />
    </div>
  )
}
