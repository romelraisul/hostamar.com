'use client'

import { useState } from 'react'

export default function DevChat({ tool }: { tool: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, message: text }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.content || data.error || 'No response' }])
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`rounded p-3 ${m.role === 'user' ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
            <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-600">Thinking…</div>}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="flex-1 rounded border border-gray-300 p-2"
          placeholder="Ask Hostamar AI..."
        />
        <button onClick={send} className="rounded bg-gray-900 px-4 py-2 text-white">Send</button>
      </div>
    </div>
  )
}
