import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Hostamar</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-gray-600 hover:text-blue-600">Pricing</a>
          <a href="#features" className="text-gray-600 hover:text-blue-600">Features</a>
          <LanguageSwitcher />
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Get Started Free
          </a>
        </div>
      </div>
    </nav>
  )
}
