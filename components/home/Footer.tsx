import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="text-xl font-bold">Hostamar</span>
            </Link>
            <p className="text-gray-400 mb-4">
              ছয়টি পণ্য, একটি প্ল্যাটফর্ম — বাংলাদেশের ক্রিয়েটর ও ব্যবসার জন্য।
            </p>
            <div className="text-xs text-gray-500">
              🇧🇩 Made in Bangladesh
            </div>
          </div>

          {/* Products — every product reachable in 1 click */}
          <div>
            <h4 className="font-bold mb-4">পণ্যসমূহ</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link href="/products" className="hover:text-white font-semibold text-gray-300">
                  → সব পণ্য
                </Link>
              </li>
              {PRODUCTS.map((p) => (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="hover:text-white inline-flex items-center gap-1">
                    <span>{p.emoji}</span>
                    <span>{p.nameBn}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold mb-4">রিসোর্স</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/prompts" className="hover:text-white">প্রম্পট লাইব্রেরি</Link></li>
              <li><Link href="/pricing" className="hover:text-white">প্ল্যান ও মূল্য</Link></li>
              <li><Link href="/blog" className="hover:text-white">ব্লগ</Link></li>
              <li><Link href="/about" className="hover:text-white">আমাদের সম্পর্কে</Link></li>
              <li><Link href="/contact" className="hover:text-white">যোগাযোগ</Link></li>
            </ul>
          </div>

          {/* Account + Legal */}
          <div>
            <h4 className="font-bold mb-4">অ্যাকাউন্ট</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="/signup" className="hover:text-white">সাইন আপ</Link></li>
              <li><Link href="/login" className="hover:text-white">লগইন</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">ড্যাশবোর্ড</Link></li>
              <li><Link href="/privacy" className="hover:text-white hover:underline">প্রাইভেসি</Link></li>
              <li><Link href="/terms" className="hover:text-white hover:underline">টার্মস</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>© 2026 hostamar.com — বাংলাদেশি ক্রিয়েটর ও ব্যবসার জন্য ❤️</p>
        </div>
      </div>
    </footer>
  )
}
