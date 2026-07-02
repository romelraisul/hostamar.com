'use client'
import CodeEditor from './components/Editor'

export default function IDEPage(){
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Dev IDE</h1>
        <p className="text-gray-600 mb-4">Fast client-side code editor with built-in TypeScript/JS evaluation.</p>
        <CodeEditor language="typescript" />
      </div>
    </div>
  )
}
