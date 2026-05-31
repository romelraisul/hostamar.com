'use client';

import Link from 'next/link';
import { Gamepad2, Trophy, Users, Star, Coins, ArrowLeft, Play } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

export default function GamePage() {
  const { t } = useLocale();

  const games = [
    { name: t('game.slotMachine'), icon: '🎰', description: t('game.slotMachineDesc') },
    { name: t('game.roulette'), icon: '🎡', description: t('game.rouletteDesc') },
    { name: t('game.blackjack'), icon: '♠️', description: t('game.blackjackDesc') },
    { name: t('game.poker'), icon: '🃏', description: t('game.pokerDesc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            LuckyStar Game
          </div>
          <div className="ml-auto flex gap-4 text-sm items-center">
            <Link href="/game" className="text-purple-400 font-semibold">{t('game.popularGames')}</Link>
            <Link href="#tournaments" className="text-gray-300 hover:text-white transition">{t('game.tournaments')}</Link>
            <Link href="#leaderboard" className="text-gray-300 hover:text-white transition">Leaderboard</Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            {t('game.title')}
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            {t('game.subtitle')}
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <button className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition transform hover:scale-105">
              <Play className="w-5 h-5 inline mr-2" />
              {t('game.startPlaying')}
            </button>
            <button className="px-8 py-3 border border-purple-500/50 rounded-lg hover:bg-purple-500/10 transition">
              <Trophy className="w-5 h-5 inline mr-2" />
              {t('game.tournaments')}
            </button>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">{t('game.popularGames')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition group cursor-pointer">
              <div className="text-6xl mb-4 group-hover:scale-110 transition">{game.icon}</div>
              <h3 className="text-xl font-bold mb-2">{game.name}</h3>
              <p className="text-gray-400 mb-4">{game.description}</p>
              <button className="w-full py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition">
                {t('game.playNow')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('game.multiplayer')}</h3>
            <p className="text-gray-400">{t('game.multiplayerDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('game.tournamentsTitle')}</h3>
            <p className="text-gray-400">{t('game.tournamentsDesc')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('game.rewards')}</h3>
            <p className="text-gray-400">{t('game.rewardsDesc')}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>{t('game.footer')}</p>
      </footer>
    </div>
  );
}