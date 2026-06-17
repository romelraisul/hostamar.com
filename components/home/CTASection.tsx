export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
      {/* Subtle bg pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-yellow-300 blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center text-white relative">
        <div className="inline-block mb-4 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
          ⏰ সীমিত বেটা অফার
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          আগামীকালের জন্য অপেক্ষা করবেন,<br />
          <span className="text-yellow-300">নাকি আজই শুরু করবেন?</span>
        </h2>
        <p className="text-xl mb-8 opacity-95">
          ৫০০+ বাংলাদেশি ক্রিয়েটর ইতিমধ্যে ব্যবহার করছেন। প্রথম ১০০ জনের জন্য <b>৫০% ডিসকাউন্ট</b>।
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/signup?ref=cta-bottom"
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            🚀 ফ্রি ট্রায়াল শুরু করুন
          </a>
          <a
            href="https://wa.me/?text=Hostamar%20সম্পর্কে%20জানতে%20চাই"
            className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
          >
            💬 WhatsApp এ জিজ্ঞেস করুন
          </a>
        </div>

        <p className="text-sm mt-6 opacity-75">
          ক্রেডিট কার্ড লাগে না · যেকোনো সময় বাতিল করা যায় · bKash/Nagad সাপোর্টেড
        </p>
      </div>
    </section>
  )
}
