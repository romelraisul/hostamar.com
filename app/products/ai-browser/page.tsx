'use client'
import Link from 'next/link'

export default function AIBrowserProductPage(){
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/products" className="text-sm text-gray-600 hover:text-black">&larr; Products</Link>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Browser</h1>
            <p className="text-gray-700 mb-4">Search the web and get AI-written answers with cited sources.</p>
            <Link href="/ai-browser" className="inline-block px-5 py-2 bg-black text-white rounded-xl">Open AI Browser</Link>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              <li>Wikipedia-backed search</li>
              <li>Ollama summary generation</li>
              <li>Cited source links</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
