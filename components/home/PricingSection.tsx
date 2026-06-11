export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-white p-8 rounded-xl border text-center">
            <h3 className="text-xl font-bold mb-4">Free</h3>
            <div className="text-4xl font-bold text-gray-900 mb-4">৳0</div>
            <p className="text-gray-600 mb-6">Forever free</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                5 videos/month
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                720p quality
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                Basic templates
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              Get Started
            </a>
          </div>

          {/* Starter */}
          <div className="bg-white p-8 rounded-xl border-2 border-blue-500 shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
              Most Popular
            </div>
            <h3 className="text-xl font-bold mb-4">Starter</h3>
            <div className="text-4xl font-bold text-blue-600 mb-4">৳2,000<span className="text-lg">/mo</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                10 videos/month
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                1080p quality
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                All templates
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                Priority support
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg bg-blue-600 text-white text-center hover:bg-blue-700">
              Choose Plan
            </a>
          </div>

          {/* Business */}
          <div className="bg-white p-8 rounded-xl border text-center">
            <h3 className="text-xl font-bold mb-4">Business</h3>
            <div className="text-4xl font-bold text-gray-900 mb-4">৳3,500<span className="text-lg">/mo</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                30 videos/month
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                4K quality
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                Custom templates
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                API access
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              Contact Sales
            </a>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">Accepted Payment Methods</p>
          <div className="flex justify-center gap-8 text-3xl">
            <span className="text-green-600" title="bKash">💳</span>
            <span className="text-purple-600" title="Crypto">🪙</span>
            <span className="text-blue-600" title="Nagad">⛔</span>
          </div>
        </div>
      </div>
    </section>
  )
}
