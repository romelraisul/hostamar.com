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
            <span className="text-purple-400 font-semibold">Choose a game</span>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3">Pick your game</h1>
            <p className="text-gray-400">Start with Slot Machine, then try the others.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: 'Slot Machine', icon: '🎰', desc: 'Spin the reels and chase multipliers.', href: '/game/slot-machine', status: 'Playable' },
              { name: 'Roulette', icon: '🎡', desc: 'Place your bets and test your luck.', href: '/game/roulette', status: 'Coming soon' },
              { name: 'Blackjack', icon: '♠️', desc: 'Beat the dealer with strategy.', href: '/game/blackjack', status: 'Coming soon' },
              { name: 'Poker', icon: '🃏', desc: 'Texas Hold’em style showdown.', href: '/game/poker', status: 'Coming soon' },
            ].map((game, i) => {
              const playable = game.status === 'Playable'
              const card = (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-5xl mb-4 transition">{game.icon}</div>
                    <h3 className="text-xl font-bold">{game.name}</h3>
                    <p className="text-gray-400 mt-1">{game.desc}</p>
                  </div>
                  <span className="shrink-0 text-xs px-2 py-1 rounded-full border border-white/10 text-gray-300">
                    {game.status}
                  </span>
                </div>
              )
              const cta = (
                <div className="mt-5">
                  <span className={`inline-block w-full py-2 rounded-xl text-center transition ${
                    playable
                      ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}>
                    {playable ? 'Play now' : 'Coming soon'}
                  </span>
                </div>
              )
              return playable ? (
                <a
                  href={game.href}
                  key={i}
                  className="group block bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition"
                >
                  {card}
                  {cta}
                </a>
              ) : (
                <div
                  key={i}
                  aria-disabled="true"
                  title="Coming soon — not available yet"
                  className="block bg-white/5 border border-white/10 rounded-2xl p-6 opacity-60"
                >
                  {card}
                  {cta}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com - LuckyStar Game. Play responsibly.</p>
      </footer>
    </div>
  )
}
