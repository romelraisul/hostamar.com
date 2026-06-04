import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function AIStudioPage() {
  const services = [
    { name: 'AI Video', href: '/dashboard/videos/new', icon: '🎬' },
    { name: 'AI Image', href: '/dashboard/ai-studio/image', icon: '🎨' },
    { name: 'AI Voice', href: '/dashboard/ai-studio/voice', icon: '🔊' },
    { name: 'AI Avatar', href: '/dashboard/ai-studio/avatar', icon: '👤' },
    { name: 'AI Translation', href: '/dashboard/ai-studio/translate', icon: '🌐' }
  ]

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Studio</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Link key={service.name} href={service.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {service.icon} {service.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>One-click AI generation</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}