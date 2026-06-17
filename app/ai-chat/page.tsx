'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Brain,
  Code,
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Trash2,
  Plus,
  Search,
  Settings,
  X,
  ChevronLeft,
  MessageSquare,
  GraduationCap,
  Coffee,
  Briefcase,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import {
  sendChatMessage,
  getConversations,
  getConversation,
  shareConversation,
  deleteConversation,
  speakText,
  stopSpeaking,
  supportsSpeechSynthesis,
  supportsSpeechRecognition,
  createSpeechRecognizer,
  formatTime,
  formatDate,
  type ModelType,
  type ToneType,
  type ChatMessage,
  type Conversation,
} from '@/lib/chat'

// Model icons
const ModelIcon = ({ model }: { model: ModelType }) => {
  switch (model) {
    case 'general':
      return <Brain className="w-4 h-4" />
    case 'code':
      return <Code className="w-4 h-4" />
    case 'creative':
      return <Sparkles className="w-4 h-4" />
  }
}

// Tone icons
const ToneIcon = ({ tone }: { tone: ToneType }) => {
  switch (tone) {
    case 'formal':
      return <GraduationCap className="w-4 h-4" />
    case 'casual':
      return <Coffee className="w-4 h-4" />
    case 'business':
      return <Briefcase className="w-4 h-4" />
  }
}

// Simple markdown renderer
function MarkdownRenderer({ content }: { content: string }) {
  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          // Code block
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/)
          if (match) {
            const [, lang, code] = match
            return (
              <div key={i} className="relative group">
                <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm">
                  <code className="text-green-400">{code}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )
          }
        }

        // Regular text - handle inline code and formatting
        const formatted = part
          .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-orange-400 text-sm">$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-yellow-300">$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
          .replace(/\n/g, '<br/>')

        return (
          <p key={i} className="text-gray-200 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />
        )
      })}
    </div>
  )
}

export default function AiChatPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState<ModelType>('general')
  const [tone, setTone] = useState<ToneType>('casual')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showToneMenu, setShowToneMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversations
  async function loadConversations() {
    try {
      const convs = await getConversations()
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  // Load a conversation
  async function loadConversation(conversationId: string) {
    try {
      const conv = await getConversation(conversationId)
      setCurrentConversation(conv)
      setMessages(conv.messages)
      setModel(conv.model as ModelType)
      setTone(conv.tone as ToneType)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  // Start new conversation
  function startNewChat() {
    setCurrentConversation(null)
    setMessages([])
    setModel('general')
    setTone('casual')
  }

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to UI immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    // Add empty assistant message placeholder
    const tempAssistantMsg: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempAssistantMsg])

    let fullResponse = ''
    let conversationId = currentConversation?.id

    try {
      await sendChatMessage(userMessage, {
        conversationId,
        model,
        tone,
        onToken: (token) => {
          fullResponse += token
          setMessages(prev =>
            prev.map((msg, i) =>
              i === prev.length - 1
                ? { ...msg, content: fullResponse }
                : msg
            )
          )
        },
        onDone: (newConversationId) => {
          conversationId = newConversationId
          if (!currentConversation && conversationId) {
            loadConversations()
          }
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map((msg, i) =>
              i === prev.length - 1
                ? { ...msg, content: `Error: ${error}` }
                : msg
            )
          )
        },
      })
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, currentConversation, model, tone])

  // Handle keyboard
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Voice input
  function toggleVoiceInput() {
    if (!supportsSpeechRecognition()) {
      alert('Speech recognition not supported in this browser')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = createSpeechRecognizer()
    if (!recognition) return

    recognitionRef.current = recognition
    recognition.start()

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')
      setInput(prev => prev + transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    setIsListening(true)
  }

  // Text-to-speech
  function toggleSpeech(text: string) {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
      return
    }

    speakText(text, 'bn-BD')
    setIsSpeaking(true)

    // Detect when speech ends
    const checkEnd = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false)
        clearInterval(checkEnd)
      }
    }, 100)
  }

  // Copy message
  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Share conversation
  async function handleShare() {
    if (!currentConversation) return

    try {
      const url = await shareConversation(currentConversation.id)
      setShareUrl(window.location.origin + url)
      setShowShareModal(true)
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  // Delete conversation
  async function handleDelete(conversationId: string) {
    if (!confirm('Delete this conversation?')) return

    try {
      await deleteConversation(conversationId)
      if (currentConversation?.id === conversationId) {
        startNewChat()
      }
      loadConversations()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  // Filtered conversations
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex flex-col border-r border-white/10`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                AI Chat
              </span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:outline-none focus:border-yellow-500/50"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`p-3 cursor-pointer border-b border-white/5 hover:bg-white/5 transition ${
                currentConversation?.id === conv.id ? 'bg-white/10 border-l-2 border-l-yellow-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conv.title || 'New Chat'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{formatDate(conv.updatedAt)}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-400">{conv._count?.messages || 0} messages</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                  className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowModelMenu(!showModelMenu); setShowToneMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                <ModelIcon model={model} />
                <span className="capitalize">{model}</span>
              </button>

              {showModelMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50">
                  {(['general', 'code', 'creative'] as ModelType[]).map(m => (
                    <button
                      key={m}
                      onClick={() => { setModel(m); setShowModelMenu(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition ${
                        model === m ? 'bg-yellow-500/10 text-yellow-400' : ''
                      }`}
                    >
                      <ModelIcon model={m} />
                      <div className="text-left">
                        <p className="font-medium capitalize">{m}</p>
                        <p className="text-xs text-gray-400">
                          {m === 'general' && 'General purpose assistant'}
                          {m === 'code' && 'Code writing and debugging'}
                          {m === 'creative' && 'Creative content generation'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tone Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowToneMenu(!showToneMenu); setShowModelMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                <ToneIcon tone={tone} />
                <span className="capitalize">{tone}</span>
              </button>

              {showToneMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50">
                  {(['formal', 'casual', 'business'] as ToneType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTone(t); setShowToneMenu(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition ${
                        tone === t ? 'bg-yellow-500/10 text-yellow-400' : ''
                      }`}
                    >
                      <ToneIcon tone={t} />
                      <div className="text-left">
                        <p className="font-medium capitalize">{t}</p>
                        <p className="text-xs text-gray-400">
                          {t === 'formal' && 'Academic, structured responses'}
                          {t === 'casual' && 'Friendly, conversational'}
                          {t === 'business' && 'Professional, concise'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentConversation && (
              <>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  title="Share conversation"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(currentConversation.id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition text-red-400"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">AI Chat Assistant</h2>
              <p className="text-gray-400 mb-8 max-w-md">
                Ask me anything! I can help with questions, writing, code, and more.
                Try in Bengali or English!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setInput('বাংলায় একটা প্রবন্ধ লেখো জলবায়ু পরিবর্তন নিয়ে')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                >
                  বাংলায় প্রবন্ধ লেখো
                </button>
                <button
                  onClick={() => setInput('Write a Python function to sort a list')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                >
                  Write Python code
                </button>
                <button
                  onClick={() => setInput('Give me 5 business ideas for a bakery shop')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                >
                  Business ideas
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                    : 'bg-white/10 border border-white/10'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div>
                    <MarkdownRenderer content={msg.content} />
                    {msg.content && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        {supportsSpeechSynthesis() && (
                          <button
                            onClick={() => toggleSpeech(msg.content)}
                            className="p-1 hover:bg-white/10 rounded transition"
                            title="Text to speech"
                          >
                            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => copyMessage(msg.content, msg.id)}
                          className="p-1 hover:bg-white/10 rounded transition"
                          title="Copy"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-500'}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (or use 🎤 for voice)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 resize-none placeholder-gray-400 focus:outline-none focus:border-yellow-500/50"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={toggleVoiceInput}
              className={`p-3 rounded-xl transition ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              title="Voice input (Bengali)"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-3">
            AI responses may be inaccurate. Verify important information.
          </p>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Share Conversation</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Anyone with this link can view this conversation.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm font-medium transition"
              >
                Copy
              </button>
            </div>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4 text-sm text-yellow-400 hover:text-yellow-300"
            >
              <ExternalLink className="w-4 h-4" />
              Open shared link
            </a>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showModelMenu || showToneMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowModelMenu(false); setShowToneMenu(false) }}
        />
      )}
    </div>
  )
}

// Helper component for back arrow
function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}
