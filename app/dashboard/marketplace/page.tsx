import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function MarketplacePage() {
  const apps = [
    { id: 'coolify', name: 'Coolify', desc: 'Self-hosting platform', icon: '🚀' },
    { id: 'supabase', name: 'Supabase', desc: 'Firebase alternative', icon: '⚡' },
    { id: 'appwrite', name: 'Appwrite', desc: 'Backend as a Service', icon: '🔥' },
    { id: 'nocodb', name: 'NocoDB', desc: 'Open-source Airtable', icon: '📊' },
    { id: 'plane', name: 'Plane', desc: 'Open-source Jira', icon: '📋' },
    { id: 'openproject', name: 'OpenProject', desc: 'Project management', icon: '📘' },
    { id: 'rocket-chat', name: 'Rocket.Chat', desc: 'Team chat', icon: '💬' }
  ]

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Self-Hosting Marketplace</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Link key={app.id} href={`/dashboard/marketplace/${app.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{app.icon} {app.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{app.desc}</p>
                <button className="mt-2 bg-blue-600 text-white px-4 py-1 rounded">
                  Install Now
                </button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}