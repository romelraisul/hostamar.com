export default function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Create
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💫</span>
            </div>
            <h3 className="text-xl font-bold mb-3">AI Generation</h3>
            <p className="text-gray-600">Create professional videos in minutes with our AI-powered engine.</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Bangla Support</h3>
            <p className="text-gray-600">Native Bangla text rendering designed for local creators.</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Fast Export</h3>
            <p className="text-gray-600">Export in 720p, 1080p, or 4K with our optimized pipeline.</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Analytics</h3>
            <p className="text-gray-600">Track performance and understand what resonates with your audience.</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Templates</h3>
            <p className="text-gray-600">50+ professionally designed templates for every occasion.</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Secure</h3>
            <p className="text-gray-600">Your content and data protected with industry-standard security.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
