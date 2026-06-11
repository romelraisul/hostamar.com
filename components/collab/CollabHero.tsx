import { Sparkles } from 'lucide-react'

export default function CollabHero() {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-6">
        <Sparkles className="w-4 h-4" />
        <span>Real-time Collaboration</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
        Code Together, In Real-Time
      </h1>
      <p className="text-xl text-gray-400 max-w-2xl mx-auto">
        Share your Dev IDE workspace with teammates. Pair program, review code, and build together from anywhere.
      </p>
    </div>
  )
}
