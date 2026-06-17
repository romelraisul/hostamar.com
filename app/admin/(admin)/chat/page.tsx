'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, RefreshCw, Image, Zap, Trash2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model: string
  timestamp: string
  loading?: boolean
}

interface Model {
  id: string
  name: string
  size: string
  type: 'chat' | 'image'
  recommended: boolean
  asyncOnly?: boolean
  circuitBreaker?: 'closed' | 'open'
}

interface CircuitBreakerState {
  [modelId: string]: 'closed' | 'open'
}

const MODELS: Model[] = [
  { id: 'smollm3:F16', name: 'Smollm3 (3B)', size: '5.73GB', type: 'chat', recommended: true },
  { id: 'qwen3.6:27B', name: 'Qwen 3.6 (27B)', size: '16.39GB', type: 'chat', recommended: false, asyncOnly: true },
  { id: 'seed-oss:36B-UD-IQ1_M', name: 'Seed OSS (36B)', size: '8.45GB', type: 'chat', recommended: false, asyncOnly: true },
  { id: 'stable-diffusion:latest', name: 'Stable Diffusion', size: '6.94GB', type: 'image', recommended: false, asyncOnly: true },
]

const AUTOMATION_PRESETS = [
  { label: 'Hostamar CEO', prompt: 'You are the CEO of Hostamar. Analyze the business, identify growth opportunities, and coordinate all agents.', icon: '👔' },
  { label: 'Marketing Agent', prompt: 'You are a marketing expert. Create marketing strategies, social media plans, and content calendars.', icon: '📢' },
  { label: 'DevOps Agent', prompt: 'You are a DevOps engineer. Manage infrastructure, deployments, monitoring, and security.', icon: '⚙️' },
  { label: 'Customer Support', prompt: 'You are a customer support specialist. Handle inquiries, troubleshoot issues, and maintain satisfaction.', icon: '🎧' },
  { label: 'Content Creator', prompt: 'You are a content creator. Generate blog posts, video scripts, and social media content for Hostamar.', icon: '✍️' },
  { label: 'Data Analyst', prompt: 'You are a data analyst. Analyze metrics, create reports, and provide data-driven insights.', icon: '📊' },
]

export default function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('smollm3:F16')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null)
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerState>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus()
  }, [isStreaming])

  useEffect(() => {
    fetch('/api/admin/models')
      .then(r => r.json())
      .then(data => {
        if (data.models) {
          const cb: CircuitBreakerState = {}
          data.models.forEach((m: any) => { cb[m.id] = m.circuitBreaker || 'closed' })
          setCircuitBreakers(cb)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/admin/models')
        .then(r => r.json())
        .then(data => {
          if (data.models) {
            const cb: CircuitBreakerState = {}
            data.models.forEach((m: any) => { cb[m.id] = m.circuitBreaker || 'closed' })
            setCircuitBreakers(prev => ({ ...prev, ...cb }))
          }
        })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const addMessage = (msg: Partial<Message>) => {
    const message: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      model: selectedModel,
      timestamp: new Date().toISOString(),
      loading: true,
      ...msg,
    }
    setMessages(prev => [...prev, message])
    return message.id
  }

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      model: 'user',
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)

    const assistantId = addMessage({})
    setIsStreaming(true)

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          systemPrompt: systemPrompt || undefined,
          temperature: 0.7,
          maxTokens: 2000,
        }),
      })

      const data = await res.json()

      if (data.success) {
        updateMessage(assistantId, {
          content: data.response,
          model: data.model || selectedModel,
          loading: false,
        })
      } else {
        throw new Error(data.error || 'Chat failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      updateMessage(assistantId, {
        content: `Error: ${msg}. Make sure Docker Model Runner is running at localhost:12434.`,
        loading: false,
      })
      setError(msg)
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selectPreset = (preset: { label: string; prompt: string }) => {
    setSystemPrompt(preset.prompt)
    setAutoMode(true)
  }

  const applyAutomation = () => {
    if (!input.trim() || isStreaming) return

    const automationPrompt = `As the Hostamar CEO AI, analyze this task and break it down into actionable steps. Assign subtasks to specialized agents (Marketing, DevOps, Customer Support, Content Creator, Data Analyst). Provide a structured execution plan with:

1. Task Analysis
2. Agent Assignments
3. Execution Steps
4. Success Metrics
5. Timeline Estimate

Task: ${input.trim()}

After analysis, begin executing the first step.`

    sendAutomationTask(automationPrompt)
  }

  const sendAutomationTask = async (fullPrompt: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[AUTOMATION] ${input.trim()}`,
      model: 'user',
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)

    const assistantId = addMessage({})
    setIsStreaming(true)

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullPrompt,
          model: 'qwen3.6:27B',
          systemPrompt: 'You are the Hostamar CEO AI. You coordinate multiple AI agents to execute complex business tasks. Always think step by step, delegate to specialized agents, and provide actionable results.',
          temperature: 0.5,
          maxTokens: 4000,
        }),
      })

      const data = await res.json()

      if (data.success) {
        updateMessage(assistantId, {
          content: data.response,
          model: data.model || selectedModel,
          loading: false,
        })
      } else {
        throw new Error(data.error || 'Automation failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      updateMessage(assistantId, {
        content: `Error: ${msg}`,
        loading: false,
      })
      setError(msg)
    } finally {
      setIsStreaming(false)
    }
  }

  const handleModelSelect = (modelId: string) => {
    const model = MODELS.find(m => m.id === modelId)
    if (model?.asyncOnly) {
      setShowConfirmModal(modelId)
    } else {
      setSelectedModel(modelId)
      fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'model_selected', details: { model: modelId } }),
      }).catch(() => {})
    }
  }

  const confirmAsyncModel = () => {
    if (showConfirmModal) {
      setSelectedModel(showConfirmModal)
      fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'model_selected', details: { model: showConfirmModal, asyncOnly: true } }),
      }).catch(() => {})
    }
    setShowConfirmModal(null)
  }

  const clearChat = () => setMessages([])

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left Panel - Settings & Automation */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 space-y-4 overflow-y-auto">
        {/* Model Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            Model Selection
          </h3>
          <div className="space-y-2">
            {MODELS.map(model => {
              const cb = circuitBreakers[model.id]
              const cbOpen = cb === 'open'
              return (
              <button
                key={model.id}
                onClick={() => !cbOpen && handleModelSelect(model.id)}
                disabled={cbOpen}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  cbOpen ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed' :
                  selectedModel === model.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                title={cbOpen ? 'Circuit breaker open — model unavailable' : model.asyncOnly ? 'Async-only model (may time out on GPU)' : ''}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{model.name}</span>
                  <div className="flex items-center gap-1.5">
                    {model.asyncOnly && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">async</span>
                    )}
                    {cbOpen && (
                      <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">offline</span>
                    )}
                    {model.recommended && (
                      <Zap className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">{model.size}</span>
              </button>
              )
            })}
          </div>
        </div>

        {/* Automation Presets */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Automation Presets
          </h3>
          <div className="space-y-1">
            {AUTOMATION_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => selectPreset(preset)}
                className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors ${
                  systemPrompt === preset.prompt
                    ? 'bg-amber-50 border border-amber-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span className="mr-1.5">{preset.icon}</span>
                <span className="font-medium text-gray-900">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        {systemPrompt && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Active Prompt</h3>
            <p className="text-xs text-gray-600 line-clamp-4">{systemPrompt}</p>
            <button
              onClick={() => { setSystemPrompt(''); setAutoMode(false) }}
              className="mt-2 text-xs text-red-600 hover:text-red-700"
            >
              Clear prompt
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI CEO Chat</h2>
              <p className="text-xs text-gray-500">
                {autoMode ? 'Automation Mode' : selectedModel}
                {systemPrompt && ' · Custom prompt active'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                {error}
              </span>
            )}
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              autoMode ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <Zap className="w-3 h-3" />
              Auto
            </label>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Bot className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500">Hostamar CEO AI</h3>
              <p className="text-sm mt-1">
                {MODELS.length} models ready · 6 automation presets
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {AUTOMATION_PRESETS.slice(0, 4).map(p => (
                  <button
                    key={p.label}
                    onClick={() => selectPreset(p)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-md'
                    : 'bg-gray-100 text-gray-900 rounded-tl-md'
                }`}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
                <p className={`text-xs mt-1 px-1 ${msg.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                  {msg.role === 'assistant' && msg.model !== 'user' ? msg.model.split(':')[0] + ' · ' : ''}
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                autoMode
                  ? "Describe a task for the AI CEO to execute..."
                  : `Chat with ${selectedModel}...`
              }
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[48px] max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
              {autoMode && (
                <button
                  onClick={applyAutomation}
                  disabled={!input.trim() || isStreaming}
                  className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Run automation"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isStreaming ? 'Generating...' : `Press Enter to send · Shift+Enter for new line`}
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Async-Only Model</h3>
            <p className="text-sm text-gray-600 mb-4">
              This model is larger than your GPU VRAM (8GB). Responses may fail or time out.
              Consider using <strong>Smollm3 (3B)</strong> for reliable performance.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmAsyncModel}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                Use anyway (may fail)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}