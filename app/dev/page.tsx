import { Metadata } from 'next';
import Link from 'next/link';
import { Code2, Terminal, Zap, Shield, ArrowLeft, Play } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dev IDE - Hostamar',
  description: 'Cloud-based IDE for developers. Code from anywhere in your browser.',
};

export default function DevPage() {
  const features = [
    { icon: Code2, title: 'Code Editor', desc: 'Full VS Code experience in browser' },
    { icon: Terminal, title: 'Terminal', desc: 'Linux terminal with full access' },
    { icon: Zap, title: 'Deploy', desc: 'One-click deployment to production' },
    { icon: Shield, title: 'Secure', desc: 'Isolated containers for each session' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dev IDE
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Code2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6">Cloud IDE for Developers</h1>
          <p className="text-xl text-gray-400 mb-8">
            Full VS Code in your browser. Code, run, and deploy from anywhere
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition">
            <Play className="w-5 h-5 inline mr-2" />
            Launch IDE
          </button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8 text-center">
          <Terminal className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Ready to Code?</h3>
          <p className="text-gray-400 mb-6">
            Full terminal access with npm, pip, git, and all your favorite tools pre-installed
          </p>
          <div className="bg-gray-900 rounded-lg p-4 max-w-lg mx-auto font-mono text-sm text-left">
            <div className="text-green-400">$ npm create hostamar@latest</div>
            <div className="text-gray-400">✓ Creating new project...</div>
            <div className="text-green-400">✓ Project ready!</div>
          </div>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com - Dev IDE</p>
      </footer>
    </div>
  );
}