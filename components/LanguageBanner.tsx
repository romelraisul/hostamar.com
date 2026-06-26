'use client';
import { useLocale } from '@/lib/locale-context';

export default function LanguageBanner() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="bg-gray-100 text-sm px-4 py-2 flex justify-between">
      <span>Language: {locale}</span>
      <button onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')} className="underline">
        Switch
      </button>
    </div>
  );
}
