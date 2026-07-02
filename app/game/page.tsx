import { ArrowLeft } from 'lucide-react'

export default function GamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <a href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            LuckyStar Game
          </div>
          <div className="ml-auto flex gap-4 text-sm items-center">
            <span className="text-purple-400 font-semibold">Popular Games</span>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">Popular Games</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Slot Machine', icon: '🎰', desc: 'Spin and win big!', href: '/game/slot-machine' },
            { name: 'Roulette', icon: '🎡', desc: 'Place your bets', href: '#' },
            { name: 'Blackjack', icon: '♠️', desc: 'Beat the dealer', href: '#' },
            { name: 'Poker', icon: '🃏', desc: 'Texas Hold em', href: '#' },
          ].map((game, i) => (
            <a href={game.href} key={i} className="block bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition group">
              <div className="text-6xl mb-4 group-hover:scale-110 transition">{game.icon}</div>
              <h3 className="text-xl font-bold mb-2">{game.name}</h3>
              <p className="text-gray-400 mb-4">{game.desc}</p>
              <span className="inline-block w-full py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition">Play Now</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com - LuckyStar Game. Play responsibly.</p>
      </footer>
    </div>
  )
}