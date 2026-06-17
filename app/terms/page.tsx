import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - Hostamar',
  description: 'Terms of service for Hostamar.com',
};

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">Last updated: April 1, 2026</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-300 mb-4">By accessing or using Hostamar.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Services</h2>
          <p className="text-gray-300 mb-4">Hostamar provides cloud hosting, AI marketing video generation, gaming, AI browser, AI chat, and development environment services. We reserve the right to modify, suspend, or discontinue any service at any time.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
          <p className="text-gray-300 mb-4">You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Payment and Billing</h2>
          <p className="text-gray-300 mb-4">All plans include a 7-day free trial. After the trial period, you will be billed according to your selected plan. Refunds are available within 30 days of purchase.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-300 mb-4">You agree not to use our services for any illegal purposes, to transmit harmful code, or to infringe on the intellectual property rights of others.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-300 mb-4">Hostamar shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact</h2>
          <p className="text-gray-300 mb-4">For questions about these terms, please contact us at <Link href="/contact" className="text-blue-400 hover:text-blue-300">/contact</Link>.</p>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com. All rights reserved.</p>
      </footer>
    </div>
  );
}
