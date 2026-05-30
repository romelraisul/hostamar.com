export default function OllamaFeaturesSection() {
  return (
    <section id="ollama-features" className="py-20 bg-gradient-to-r from-indigo-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full mb-4">
            Ollama AI Integration
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Run Local AI Models with Ollama
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Hostamar integrates seamlessly with Ollama to bring powerful, private, and local AI
            capabilities right to your hosting environment. No cloud dependency, no API costs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl border border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Local Model Hosting</h3>
            <p className="text-gray-600">
              Deploy and run Ollama models (Llama 3, Mistral, Gemma, Phi) directly on your Hostamar VPS.
              Full privacy — your data never leaves your server.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Lightning Fast Inference</h3>
            <p className="text-gray-600">
              Powered by dedicated GPU resources on our high-performance VPS plans.
              Get sub-second response times for your AI applications.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/50 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">One-Click Deploy</h3>
            <p className="text-gray-600">
              Pre-configured Ollama stack with one-click deployment. Includes API endpoints,
              web UI, and monitoring — ready in minutes, not hours.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all hover:shadow-lg"
          >
            Deploy Ollama on Hostamar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <p className="mt-3 text-sm text-gray-500">
            Available on all Business and Enterprise plans. 7-day free trial included.
          </p>
        </div>
      </div>
    </section>
  )
}
