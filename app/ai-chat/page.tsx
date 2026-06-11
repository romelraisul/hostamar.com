import { Metadata } from 'next';
import Link from 'next/link';
import { Brain, MessageSquare, Code, Image, Languages, Zap, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Chat - Hostamar',
  description: 'Chat with multiple AI models. Code assistance, content creation, and translation.',
};

export default function AiChatPage() {
  const models = [
    { name: 'GPT-4', icon: Brain, color: 'from-purple-400 to-pink-400' },
    { name: 'Claude 3', icon: MessageSquare, color: 'from-orange-400 to-red-400' },
    { name: 'Gemini', icon: Zap, color: 'from-blue-400 to-cyan-400' },
    { name: 'Llama 3', icon: Brain, color: 'from-green-400 to-teal-400' },
  ];

  const features = [
    { icon: Code, title: 'Code Assistant', desc: 'Write, debug, and optimize code' },
    { icon: Image, title: 'Image Generation', desc: 'Create images from text prompts' },
    { icon: Languages, title: 'Translation', desc: 'Translate between 50+ languages' },
    { icon: MessageSquare, title: 'Conversational AI', desc: 'Natural conversations with context' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            AI Chat
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6">Chat with AI Models</h1>
          <p className="text-xl text-gray-400 mb-8">
            Access multiple AI models for code, content, images, and conversation
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition">
            Start Chatting
          </button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Available Models</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {models.map((model, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition">
              <div className={`w-12 h-12 bg-gradient-to-r ${model.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                <model.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold">{model.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com - AI Chat</p>
      </footer>
    </div>
  );
}