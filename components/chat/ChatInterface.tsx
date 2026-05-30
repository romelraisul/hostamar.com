'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  videoId?: string | null
  videoTitle?: string
}

export default function ChatInterface({ videoId, videoTitle }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: videoId
        ? `👋 আমি Hostamar AI। এই ভিডিও সম্পর্কে আপনার যেকোনো প্রশ্ন করতে পারেন - স্ক্রিপ্ট, কন্টেন্ট, মার্কেটিং আইডিয়া, সবকিছু!`
        : `👋 আমি Hostamar AI! আপনার ভিডিও কন্টেন্ট নিয়ে আমি সাহায্য করতে পারি। একটি ভিডিও সিলেক্ট করুন অথবা যেকোনো প্রশ্ন করুন!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, videoId: videoId || null, history }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to send message')
      }

      // Read streaming response
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              assistantMessage += parsed.token
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
                return updated
              })
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setMessages((prev) => prev.filter((m) => m.content !== ''))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[500px] bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      {videoTitle && (
        <div className="px-4 py-2.5 border-b border-white/10 bg-white/5">
          <p className="text-xs text-gray-400">Chatting about:</p>
          <p className="text-sm text-white font-medium truncate">{videoTitle}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white/10 text-gray-200 rounded-bl-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content || (loading && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '')}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && <p className="px-4 py-2 text-xs text-red-400 bg-red-500/10">{error}</p>}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={videoId ? 'Ask about this video...' : 'Ask anything about video content...'}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-yellow-600 hover:to-orange-600 transition-all shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
