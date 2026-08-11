'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { type Locale } from '@/lib/i18n'

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const translations: Record<string, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',
    'nav.dashboard': 'Dashboard',
    'hero.title': 'AI Video Marketing for Bangladesh',
    'hero.subtitle': 'Create stunning AI videos in seconds',
    'hero.cta': 'Start Free',
    'admin.welcome': 'Welcome, Admin!',
    'admin.welcomeDesc': 'View your platform overview',
    'admin.today': "Today's Date",
    'admin.overview': 'Overview',
    'admin.customers.title': 'Customers',
    'admin.orders': 'Orders',
    'admin.payments': 'Payments',
    'admin.recentActivity': 'Recent Activity',
    'logs.loading': 'Loading...',
  },
  bn: {
    'nav.home': 'হোম',
    'nav.products': 'পণ্য',
    'nav.pricing': 'মূল্য',
    'nav.about': 'আমাদের সম্পর্কে',
    'nav.contact': 'যোগাযোগ',
    'nav.login': 'লগইন',
    'nav.signup': 'সাইন আপ',
    'nav.logout': 'লগআউট',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'hero.title': 'বাংলাদেশের জন্য AI ভিডিও মার্কেটিং',
    'hero.subtitle': 'সেকেন্ডের মধ্যে অসাধারণ AI ভিডিও তৈরি করুন',
    'hero.cta': 'ফ্রি শুরু করুন',
    'admin.welcome': 'স্বাগতম, অ্যাডমিন!',
    'admin.welcomeDesc': 'আপনার প্ল্যাটফর্ম ওভারভিউ দেখুন',
    'admin.today': 'আজকের তারিখ',
    'admin.overview': 'ওভারভিউ',
    'admin.customers.title': 'কাস্টমার',
    'admin.orders': 'অর্ডার',
    'admin.payments': 'পেমেন্ট',
    'admin.recentActivity': 'সাম্প্রতিক কার্যকলাপ',
    'logs.loading': 'লোড হচ্ছে...',
  },
  ur: {
    'nav.home': 'ہوم',
    'nav.products': 'پروڈکٹس',
    'nav.pricing': 'قیمتیں',
    'nav.about': 'ہمارے بارے میں',
    'nav.contact': 'رابطہ',
    'nav.login': 'لاگ ان',
    'nav.signup': 'سائن اپ',
    'nav.logout': 'لاگ آؤٹ',
    'nav.dashboard': 'ڈیش بورڈ',
    'hero.title': 'بنگلہ دیش کے لیے AI ویڈیو مارکیٹنگ',
    'hero.subtitle': 'سیکنڈوں میں شاندار AI ویڈیو بنائیں',
    'hero.cta': 'مفت شروع کریں',
    'admin.welcome': 'خوش آمدید، ایڈمن!',
    'admin.welcomeDesc': 'اپنے پلیٹ فارم کا جائزہ دیکھیں',
    'admin.today': 'آج کی تاریخ',
    'admin.overview': 'جائزہ',
    'admin.customers.title': 'گاہک',
    'admin.orders': 'آرڈرز',
    'admin.payments': 'ادائیگیاں',
    'admin.recentActivity': 'حالیہ سرگرمی',
    'logs.loading': 'لوڈ ہو رہا ہے...',
  },
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof document !== 'undefined') {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
    }
  }, [])

  const t = useCallback((key: string) => {
    return translations[locale]?.[key] || translations['en']?.[key] || key
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

export default LocaleContext
