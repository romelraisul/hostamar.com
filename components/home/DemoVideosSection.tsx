'use client'

export default function DemoVideosSection() {
  const demos = [
    {
      id: 'islamic-new-year',
      title: 'Islamic New Year Demo',
      bnTitle: 'ইসলামিক নতুন বছর',
      embedId: '_PLACEHOLDER_', // Replace with actual YouTube ID
      thumbnail: '/demo/islamic-new-year-thumb.jpg'
    },
    {
      id: 'eid-celebration',
      title: 'Eid Celebration Demo',
      bnTitle: 'ইদ উদযাপন',
      embedId: '_PLACEHOLDER_',
      thumbnail: '/demo/eid-celebration-thumb.jpg'
    },
    {
      id: 'business-promo',
      title: 'Business Promotion Demo',
      bnTitle: 'ব্যবসা প্রোমোশন',
      embedId: '_PLACEHOLDER_',
      thumbnail: '/demo/business-promo-thumb.jpg'
    }
  ]

  return (
    <section className="py-16 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            AI Studio Demo Videos
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Watch how Hostamar creates professional videos in 30 seconds
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {demos.map((demo) => (
            <div key={demo.id} className="group cursor-pointer">
              <div className="aspect-video bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden mb-4 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <img
                  src={demo.thumbnail}
                  alt={demo.title}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-center">
                {demo.bnTitle}
              </h3>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href="/dashboard/videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Create Your Own Video
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}