'use client'

import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

export default function Footer() {
  const { t, locale } = useLocale()
  const isBengali = locale === 'bn'
  return (
    <footer className="bg-[#18181B] text-zinc-300">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-14 md:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C3A] font-bold text-white">
              H
            </div>
            <span className="text-xl font-bold text-white">Hostamar</span>
          </div>
          <p className="text-sm text-zinc-400">{t('footer.tagline')}</p>
        </div>

        <div>
          <h4 className="mb-4 font-semibold text-white">{isBengali ? 'প্রোডাক্ট' : 'Product'}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/generate" className="hover:text-white">{isBengali ? 'ভিডিও বানান' : 'Make video'}</Link></li>
            <li><Link href="/prompts" className="hover:text-white">{isBengali ? 'টেমপ্লেট' : 'Templates'}</Link></li>
            <li><Link href="/pricing" className="hover:text-white">{isBengali ? 'প্রাইসিং' : 'Pricing'}</Link></li>
            <li><Link href="/products" className="hover:text-white">{isBengali ? 'Labs' : 'Labs'}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-semibold text-white">{isBengali ? 'কোম্পানি' : 'Company'}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">{isBengali ? 'সম্পর্কে' : 'About'}</Link></li>
            <li><Link href="/blog" className="hover:text-white">{isBengali ? 'ব্লগ' : 'Blog'}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{isBengali ? 'যোগাযোগ' : 'Contact'}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-semibold text-white">{isBengali ? 'সাপোর্ট' : 'Support'}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-white">{isBengali ? 'প্রাইভেসি' : 'Privacy'}</Link></li>
            <li><Link href="/terms" className="hover:text-white">{isBengali ? 'শর্তাবলী' : 'Terms'}</Link></li>
            <li><Link href="/refund" className="hover:text-white">{isBengali ? 'রিফান্ড' : 'Refund'}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        {isBengali ? '🇧🇩 বাংলাদেশে তৈরি · Hostamar' : '🇧🇩 Made in Bangladesh · Hostamar'}
      </div>
    </footer>
  )
}
