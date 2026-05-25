'use client'

import CopyUrlButton from '@/components/CopyUrlButton'

interface VideoPreviewProps {
  isGenerating: boolean
  generatedUrl: string | null
  progress: number
}

function ProgressIndicator({ progress }: { progress: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-white text-sm mt-2 font-medium">{Math.round(progress)}% সম্পন্ন...</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium text-lg">AI কাজ করছে...</p>
            <p className="text-blue-200 text-sm mt-1">
              {progress < 30 ? 'ভিডিও স্ক্রিপ্ট লেখা হচ্ছে...' :
               progress < 60 ? 'ভিডিও জেনারেট হচ্ছে...' :
               progress < 90 ? 'অডিও যোগ করা হচ্ছে...' : 'শেষ স্পর্শ দেওয়া হচ্ছে...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function VideoResult({ url }: { url: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">✅ ভিডিও তৈরি হয়েছে!</h3>
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <video src={url} className="w-full h-full object-contain" controls poster="/video-poster.jpg">
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <CopyUrlButton url={typeof window !== 'undefined' ? window.location.origin + url : (process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com') + url} />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">✏️ সম্পাদনা করুন</button>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">📤 ডাউনলোড</button>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">📱 শেয়ার করুন</button>
      </div>
    </div>
  )
}

function EmptyPreview() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl flex items-center justify-center min-h-[400px]">
      <div className="text-center text-gray-400">
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-lg">বাম দিক থেকে টেমপ্লেট বেছে নিন</p>
        <p className="text-sm mt-2">তারপর &quot;ভিডিও তৈরি করুন&quot; বাটনে ক্লিক করুন</p>
      </div>
    </div>
  )
}

export default function VideoPreview({ isGenerating, generatedUrl, progress }: VideoPreviewProps) {
  if (isGenerating) {
    return <ProgressIndicator progress={progress} />
  }

  if (generatedUrl) {
    return <VideoResult url={generatedUrl} />
  }

  return <EmptyPreview />
}
