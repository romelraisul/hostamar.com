'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const MODELS = [
  { id: 'qwen3.6:latest', label: 'Qwen 3.6' },
  { id: 'hermes3:latest', label: 'Hermes 3' },
  { id: 'granite4.1:8b', label: 'Granite 4.1' },
]

type MessageRole = 'user' | 'assistant'

interface Message {
  id: string
  role: MessageRole
  content: string
  model?: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export default function AiChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [model, setModel] = useState(MODELS[0].id)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId)
    }
  }, [activeConversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, loading])

  async function loadConversations() {
    try {
      const res = await fetch('/api/chat/conversations')
      if (res.ok) {
        const data = await res.json()
        const list = data.conversations || []
        setConversations(list)
        if (list.length && !activeConversationId) {
          setActiveConversationId(list[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`)
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        setMessages(msgs)
        scrollToBottom()
      }
    } catch {
      // ignore
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.messages)) {
          setMessages(data.messages)
        }
      }
    } catch {
      // ignore
    }
  }

  async function createConversation() {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New conversation' }),
      })
      if (res.ok) {
        const data = await res.json()
        const conversation = data.conversation
        setConversations((prev) => [conversation, ...prev])
        setActiveConversationId(conversation.id)
        setMessages([])
        setError('')
      }
    } catch {
      setError('Could not create conversation')
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading || thinking) return

    const conversationId = activeConversationId
    if (!conversationId) {
      setError('No conversation selected')
      return
    }

    setInput('')
    setError('')
    setLoading(true)
    setThinking(true)

    const optimisticUserMessage: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticUserMessage])
    scrollToBottom()

    try {
      const res = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model,
          conversationId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to send message')
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let assistantMessage = ''
        const assistantId = `local-${Date.now() + 1}`

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() }])
        scrollToBottom()

        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              setThinking(false)
              continue
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                assistantMessage += parsed.token
                setMessages((prev) => {
                  const updated = prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantMessage } : m
                  )
                  return updated
                })
                scrollToBottom()
              }
              if (parsed.conversationId && parsed.conversationId !== conversationId) {
                setActiveConversationId(parsed.conversationId)
              }
            } catch {
              // ignore
            }
          }
        }
      } else {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now() + 1}`, role: 'assistant', content: data.content || '', createdAt: new Date().toISOString() },
        ])
        if (data.conversationId && data.conversationId !== conversationId) {
          setActiveConversationId(data.conversationId)
        }
      }
    } catch (err: any) {
      const message = err.message || 'Something went wrong'
      setError(message)
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('local-') || m.content !== ''))
    } finally {
      setLoading(false)
      setThinking(false)
      loadConversations()
      if (activeConversationId) {
        loadConversation(activeConversationId)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 30)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="lg:hidden absolute top-4 left-4 z-20 bg-white/10 border border-white/20 rounded-lg p-2"
      >
        {sidebarOpen ? 'Close' : 'Chats'}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-10 w-72 bg-gray-950 border-r border-white/10 transition-transform`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
            <p className="text-xs text-gray-400">Sign in to sync chats</p>
          </div>
          <button
            onClick={createConversation}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition"
          >
            New chat
          </button>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveConversationId(c.id)
                setSidebarOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                activeConversationId === c.id
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-400/40'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <p className="truncate">{c.title}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                {new Date(c.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <div>
            <h1 className="text-sm font-semibold text-white">AI Chat</h1>
            <p className="text-xs text-gray-400">
              Model: <span className="text-yellow-300">{model}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-white/10 border border-white/20 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-gray-900">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!activeConversationId && (
            <div className="py-20 text-center text-gray-500 text-sm">
              Create or select a conversation to start chatting.
            </div>
          )}
          {activeConversationId && messages.length === 0 && !thinking && (
            <div className="py-20 text-center text-gray-500 text-sm">
              Start the conversation by typing a message below.
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-[10px] font-bold text-white">AI</span>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-[10px] font-bold text-white">You</span>
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] font-bold text-white">AI</span>
              </div>
              <div className="bg-white/10 text-gray-300 rounded-2xl rounded-bl-sm px-4 py-3 text-xs space-x-1">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-pulse delay-75">.</span>
                <span className="animate-pulse delay-150">.</span>
                <span className="animate-pulse delay-300">.</span>
              </div>
            </div>
          )}

          {loading && !thinking && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] text-gray-300">...</span>
              </div>
              <div className="bg-white/10 text-gray-300 rounded-2xl rounded-bl-sm px-4 py-3 text-xs">
                Generating response...
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Error */}
        {error && <p className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-t border-white/10">{error}</p>}

        {/* Input */}
        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConversationId}
              placeholder={activeConversationId ? 'Type your message...' : 'Select a conversation first'}
              rows={1}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-[120px] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || thinking || !activeConversationId}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
