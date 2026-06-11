interface GenerateHeroProps {
  onTabChange: (tab: string) => void
}

export default function GenerateHero({ onTabChange }: GenerateHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in-up">
          AI দিয়ে ভিডিও তৈরি করুন
        </h1>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          প্রশিক্ষিত AI দিয়ে সেকেন্ডে প্রফেশনাল মার্কেটিং ভিডিও তৈরি করুন — বাংলা সহ!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => onTabChange('generate')}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg hover:shadow-xl">
            🎬 ভিডিও তৈরি করুন
          </button>
          <button onClick={() => onTabChange('pricing')}
            className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
            💰 প্রাইসিং
          </button>
        </div>
      </div>
    </section>
  )
}
