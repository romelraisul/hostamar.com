import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function NotFound() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">{t('notFound.title', locale)}</h1>
        <p className="text-xl text-gray-600 mt-4">{t('notFound.message', locale)}</p>
        <a href="/" className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {t('notFound.goHome', locale)}
        </a>
      </div>
    </div>
  )
}
