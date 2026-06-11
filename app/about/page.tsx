import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Cloud, Video, Users, Zap, Shield, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About - Hostamar',
  description: 'Learn more about Hostamar - your all-in-one platform.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hostamar.com
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          About Hostamar
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-16">
          We're building the all-in-one platform that brings together cloud hosting, AI marketing, gaming, and development tools under one roof.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Cloud Hosting</h3>
            <p className="text-gray-400">Reliable VPS, RDP, and web hosting with 99.9% uptime guarantee.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">AI Marketing</h3>
            <p className="text-gray-400">Auto-generate professional marketing videos with AI-powered tools.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">AI Tools</h3>
            <p className="text-gray-400">Free AI chat, intelligent browser, and cloud development environment.</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-16">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg opacity-90 mb-8">
            We believe everyone deserves access to powerful tools for building their online presence, creating content, and developing software. Hostamar makes it simple, affordable, and accessible.
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition">
            Get Started Free →
          </Link>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com. All rights reserved.</p>
      </footer>
    </div>
  );
}
