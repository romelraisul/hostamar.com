import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Hostamar',
  description: 'Privacy policy for Hostamar.com',
};

export default function PrivacyPage() {
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

      <section className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">Last updated: April 1, 2026</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <Shield className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-bold mb-2">Data Protection</h3>
              <p className="text-sm text-gray-400">We use industry-standard encryption to protect your data.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <Eye className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-bold mb-2">Transparency</h3>
              <p className="text-sm text-gray-400">We&apos;re clear about what data we collect and why.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-300 mb-4">We collect information you provide directly, such as your name, email address, and payment information. We also collect usage data to improve our services.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-300 mb-4">We use your information to provide, maintain, and improve our services, process payments, and communicate with you about updates and promotions.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">3. Data Sharing</h2>
          <p className="text-gray-300 mb-4">We do not sell your personal information. We may share data with trusted service providers who assist us in operating our platform, subject to confidentiality agreements.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
          <p className="text-gray-300 mb-4">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Your Rights</h2>
          <p className="text-gray-300 mb-4">You have the right to access, correct, or delete your personal data. Contact us at <Link href="/contact" className="text-blue-400 hover:text-blue-300">/contact</Link> to exercise these rights.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Cookies</h2>
          <p className="text-gray-300 mb-4">We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content.</p>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com. All rights reserved.</p>
      </footer>
    </div>
  );
}
