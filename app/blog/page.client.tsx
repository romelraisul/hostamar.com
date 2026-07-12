"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Calendar,
  Tag,
  BookOpen
} from "lucide-react"

// Blog posts data
const blogPosts = [
  {
    id: 1,
    title: "AI দিয় ভিডিও তৈরি — পূর্ণাঙ্গ গাইড ২০২৬",
    excerpt: "হোস্টামারের সাহায্যে AI দিয় প্রফেশনাল ভিডিও কিভাবে তৈরি করবেন — স্টেপ বাই স্টেপ গাইড",
    category: "ভিডিও টিউটোরিয়াল",
    readTime: "৫ মিনিট",
    date: "২০২৬-০৫-১০",
    views: 1520,
    tags: ["AI", "ভিডিও", "টিউটোরিয়াল"]
  },
  {
    id: 2,
    title: "৫০০ টাকা দিয় বিজনেস শুরু করুন — AI ভিডিও সার্ভিস",
    excerpt: "ন্যূনতম বাজেটে AI ভিডিও সার্ভিস শুরু করার উপায় এবং আয়ের সম্ভাবনা",
    category: "ব্যবসা",
    readTime: "৪ মিনিট",
    date: "২০২৬-০৫-০৮",
    views: 2340,
    tags: ["ব্যবসা", "AI", "এন্ট্রিপ্রেনিউর"]
  },
  {
    id: 3,
    title: "bKash দিয় অনলাইন পেমেন্ট — সহজ ও নিরাপদ",
    excerpt: "Hostamar-এ bKash, Nagad, Rocket ও USDT দিয় কিভাবে পেমেন্ট করবেন",
    category: "পেমেন্ট গাইড",
    readTime: "৩ মিনিট",
    date: "২০২৬-০৫-০৬",
    views: 890,
    tags: ["পেমেন্ট", "bKash", "নাগরিক"]
  },
  {
    id: 4,
    title: "Facebook গ্রুপ থেকে কাস্টমার পাবেন — প্রফেশনাল টিপস",
    excerpt: "৪০০K+ মেম্বের ফেসবুক গ্রুপ থেকে কাস্টমার এক্সাক্ট করবেন",
    category: "মার্কেটিং",
    readTime: "৬ মিনিট",
    date: "২০২৬-০৫-০৪",
    views: 3210,
    tags: ["মার্কেটিং", "ফেসবুক", "কাস্টমার"]
  },
  {
    id: 5,
    title: "AI মার্কেটিং ভিডিও — কেন ব্যবসার জন্য অপরিহার্য",
    excerpt: "২০২৬ সালে মার্কেটিং ভিডিও বানাতে কেন AI ব্যবহার করা উচিৎ",
    category: "আইনি",
    readTime: "৭ মিনিট",
    date: "২০২৬-০৫-০১",
    views: 4100,
    tags: ["AI", "মার্কেটিং", "ট্রেন্ড"]
  }
]

export default function BlogPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const categories = ["all", "ভিডিও টিউটোরিয়াল", "ব্যবসা", "পেমেন্ট গাইড", "মার্কেটিং", "আইনি"]

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">📰 হোস্টামার ব্লগ</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          AI ভিডিও, ব্যবসা, মার্কেটিং ও টেকনোলজি — বাংলায় সর্বশেষ আপডেট
        </p>
      </section>

      {/* Search & Filter */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="আর্টিকেল খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {cat === "all" ? "সব" : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Blog Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <article
              key={post.id}
              onClick={() => router.push(`/blog/${post.id}`)}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:border-white/20 transition-all hover:shadow-lg hover:shadow-blue-500/5 group"
            >
              <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Tag className="absolute top-3 left-3 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-full" />
                <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {post.views}
                </span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold text-lg group-hover:underline transition">
                    {post.title}
                  </h3>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-3">{post.excerpt}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>কোনো আর্টিকেল পাওয়া যায়নি</p>
          </div>
        )}
      </section>
    </main>
  )
}