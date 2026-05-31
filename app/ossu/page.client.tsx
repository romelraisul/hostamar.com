'use client'

import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

export default function OSSUPageClient() {
  const { t } = useLocale()

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>{t('ossu.academy')}</h1>
      <p>{t('ossu.learnCS')}</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/ossu/curriculum" style={{ marginRight: '1rem' }}>
          {t('ossu.viewCurriculum')}
        </Link>
        <a
          href="https://ossu-academy-j61dxn3ht-romelraisul-8939s-projects.vercel.app"
          target="_blank"
        >
          {t('ossu.fullOSSU')}
        </a>
      </div>
    </div>
  )
}
