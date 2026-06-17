import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'

// Top nav: brand + Products dropdown + secondary links + CTA.
// Client interactivity is minimal because Next.js can statically render the
// whole page; the dropdown uses :hover and :focus-within (CSS), no JS needed.
export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Hostamar</span>
        </Link>

        {/* Center links — Products dropdown is the key affordance */}
        <div className="hidden md:flex items-center gap-1">
          {/* Products dropdown */}
          <div className="relative group">
            <button
              className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium rounded-lg inline-flex items-center gap-1"
              type="button"
            >
              Products <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown panel: opens on hover (md+) and on focus-within (a11y). */}
            <div
              className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-40"
              role="menu"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-[640px] grid grid-cols-2 gap-2">
                <Link
                  href="/products"
                  className="col-span-2 px-3 py-2 mb-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 flex items-center justify-between"
                  role="menuitem"
                >
                  <span className="font-bold text-gray-900">🛠 সব পণ্য দেখুন</span>
                  <span className="text-xs text-blue-700">6টি →</span>
                </Link>
                {PRODUCTS.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-start gap-3"
                    role="menuitem"
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{p.nameBn}</span>
                        <span className="text-xs text-gray-400">{p.badge}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{p.taglineBn}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary links */}
          <Link href="/pricing" className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium rounded-lg">
            Pricing
          </Link>
          <Link href="/prompts" className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium rounded-lg">
            Prompts
          </Link>
          <Link href="/blog" className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium rounded-lg">
            Blog
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
          >
            লগইন
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm"
          >
            ফ্রি শুরু করুন
          </Link>
        </div>
      </div>
    </nav>
  )
}
