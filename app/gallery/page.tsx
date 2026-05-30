"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Play,
  Download,
  Share2,
  Eye,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Edit3,
  Copy
} from "lucide-react"

// Mock gallery videos — replace with real API data
const mockVideos = [
  {
    id: "vid_001",
    title: "প্রোডাক্ট ডেমো ভিডিও — ফ্যাশন ব্র্যান্ড",
    thumbnail: null,
    duration: 45,
    quality: "1080p",
    status: "completed",
    views: 1250,
    likes: 89,
    createdAt: "২০২৬-০৫-১০",
    template: "Product Demo"
  },
  {
    id: "vid_002",
    title: "সোশ্যাল মিডিয়া অ্যাড — বিউটি পার্লোর",
    thumbnail: null,
    duration: 30,
    quality: "720p",
    status: "completed",
    views: 890,
    likes: 45,
    createdAt: "২০২৬-০৫-০৮",
    template: "Social Ad"
  },
  {
    id: "vid_003",
    title: "এক্সপ্লেইনার ভিডিও — টেক প্রোডাক্ট",
    thumbnail: null,
    duration: 60,
    quality: "1080p",
    status: "completed",
    views: 2100,
    likes: 156,
    createdAt: "২০২৬-০৫-০৫",
    template: "Explainer"
  }
]

export default function VideoGallery() {
  const router = useRouter()
  const [videos] = useState(mockVideos)
  const [selectedQuality, setSelectedQuality] = useState("all")

  const qualityCounts = {
    all: videos.length,
    "1080p": videos.filter(v => v.quality === "1080p").length,
    "720p": videos.filter(v => v.quality === "720p").length,
    "4K": videos.filter(v => v.quality === "4K").length
  }

  const filteredVideos = selectedQuality === "all"
    ? videos
    : videos.filter(v => v.quality === selectedQuality)

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-green-500/20 text-green-400",
      processing: "bg-yellow-500/20 text-yellow-400",
      failed: "bg-red-500/20 text-red-400",
      queued: "bg-blue-500/20 text-blue-400"
    }
    const labels = {
      completed: "পুরো হয়েছে",
      processing: "প্রক্রিয়াজাত",
      failed: "ব্যর্থ",
      queued: "সরিবদ্ধ"
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.queued}`}>
      {labels[status] || status}
    </span>
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Play className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">আমার ভিডিওগুলো</span>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">🎬 ভিডিও গ্যালারি</h1>
        <p className="text-gray-400 text-lg">আপনার তৈরি সব AI ভিডিও এক জায়গায়</p>
      </section>

      {/* Stats Bar */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="flex gap-4 justify-center flex-wrap">
          {Object.entries(qualityCounts).map(([q, count]) => (
            <button
              key={q}
              onClick={() => setSelectedQuality(q)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedQuality === q
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {q.charAt(0).toUpperCase() + q.slice(1)} ({count})
            </button>
          ))}
        </div>
      </section>

      {/* Video Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(video => (
            <article
              key={video.id}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden group hover:shadow-lg hover:shadow-purple-500/5 transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white/30 group-hover:text-white/60 transition" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {getStatusBadge(video.status)}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  {video.duration}s • {video.quality}
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>📄 {video.template}</span>
                  <span>📅 {video.createdAt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Eye className="w-4 h-4" /> {video.views}
                    </span>
                    <span className="flex items-center gap-1 text-green-400">
                      <ThumbsUp className="w-4 h-4" /> {video.likes}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition" title="পুনরায় ডাউনলোড">
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition" title="শেয়ার">
                      <Share2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition" title="কপি করুন">
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <Play className="w-16 h-16 mx-auto mb-6 opacity-30" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">কোনো ভিডিও নেই!</h3>
            <p className="text-gray-500">আপনার প্রথম AI ভিডিও তৈরি করতে নিচের বাটনে ক্লিক করুন</p>
            <button
              onClick={() => router.push('/generate')}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition"
            >
              ভিডিও তৈরি শুরু করুন →
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function ArrowRight(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
}