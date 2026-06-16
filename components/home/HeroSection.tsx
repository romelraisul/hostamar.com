export default function HeroSection() {
  return (
    <>
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="animate-fade-in">
          {/* Bangla-first badge — speaks the language of the buyer */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-green-700">বাংলাদেশি ক্রিয়েটরদের জন্য তৈরি</span>
          </div>

          {/* Headline: lead with the pain, then the promise */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            একটা প্রম্পট দিন,
            <br />
            <span className="text-blue-600">৯০ সেকেন্ডে ভিডিও পান।</span>
          </h1>

          <p className="text-xl text-gray-600 mb-3 max-w-2xl mx-auto">
            হোস্টামার দিয়ে আজই ১০টা AI ভিডিও বানান — মাসে মাত্র <b>৳২,০০০</b>।
          </p>
          <p className="text-sm text-gray-500 mb-8 max-w-xl mx-auto">
            বাংলা স্ক্রিপ্ট, বাংলা ভয়েসওভার, বাংলা ক্যাপশন — সব অটো।
          </p>

          {/* Save calculator — the actual money hook */}
          <div className="max-w-2xl mx-auto bg-white border-2 border-blue-100 rounded-2xl p-6 my-10 shadow-lg">
            <div className="text-sm font-semibold text-gray-500 mb-3">⚡ বিকল্প হিসাব</div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">ফ্রিল্যান্স এডিটর দিয়ে</div>
                <div className="text-2xl font-bold text-red-600 line-through">৳৮০০–১,৫০০</div>
                <div className="text-xs text-gray-500">প্রতি ভিডিও</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">হোস্টামার দিয়ে</div>
                <div className="text-2xl font-bold text-green-600">৳২০০</div>
                <div className="text-xs text-gray-500">প্রতি ভিডিও (প্ল্যানে)</div>
              </div>
            </div>
            <div className="mt-4 text-sm font-semibold text-blue-700">
              💰 মাসে <b>১০টা ভিডিও</b> করলে সাশ্রয় <b>৳৬,০০০–১৩,০০০</b>
            </div>
          </div>

          {/* Primary CTAs — speak the buyer's language */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <a
              href="/signup?ref=hero"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 ৭ দিন ফ্রি ট্রায়াল শুরু করুন
            </a>
            <a
              href="/prompts"
              className="px-8 py-4 border-2 border-blue-200 text-blue-700 text-lg font-semibold rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              🎬 প্রম্পট দেখুন
            </a>
          </div>

          {/* Trust row — minimal, real */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              ক্রেডিট কার্ড লাগে না
            </span>
            <span>💸 bKash / Nagad / Rocket</span>
            <span>🇧🇩 Made in Bangladesh</span>
            <span>⏱️ ৯০ সেকেন্ডে রেজাল্ট</span>
          </div>
        </div>
      </section>
    </>
  )
}
