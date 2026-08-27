'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function AIStudioPage() {
  const services = [
    { name: 'এআই ভিডিও', href: '/dashboard/videos/new', icon: '🎬' },
    { name: 'এআই ইমেজ', href: '/dashboard/ai-studio/image', icon: '🎨' },
    { name: 'এআই ভয়েস', href: '/dashboard/ai-studio/voice', icon: '🔊' },
    { name: 'এআই অ্যাভাটার', href: '/dashboard/ai-studio/avatar', icon: '👤' },
    { name: 'এআই অনুবাদ', href: '/dashboard/ai-studio/translate', icon: '🌐' }
  ]

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">এআই স্টুডিও</h1>
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
                <p>ওয়ান-ক্লিকে এআই জেনারেশন</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
