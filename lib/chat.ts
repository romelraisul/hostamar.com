/**
 * Chat Service - Client-side utilities for AI Chat
 */

export type ModelType = 'general' | 'code' | 'creative'
export type ToneType = 'formal' | 'casual' | 'business'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  model: ModelType
  tone: ToneType
  isPublic: boolean
  shareSlug: string | null
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  _count?: { messages: number }
}

// Model display names
export const MODEL_NAMES: Record<ModelType, string> = {
  general: 'General',
  code: 'Code',
  creative: 'Creative',
}

// Model descriptions
export const MODEL_DESCRIPTIONS: Record<ModelType, string> = {
  general: 'General purpose assistant for questions and tasks',
  code: 'Specialized for code writing, debugging, and optimization',
  creative: 'Best for creative writing, brainstorming, and content',
}

// Tone display names
export const TONE_NAMES: Record<ToneType, string> = {
  formal: 'Formal',
  casual: 'Casual',
  business: 'Business',
}

// Tone descriptions
export const TONE_DESCRIPTIONS: Record<ToneType, string> = {
  formal: 'Academic, proper grammar, structured responses',
  casual: 'Friendly, conversational, relaxed tone',
  business: 'Professional, concise, actionable insights',
}

// Model icons (Lucide icon names)
export const MODEL_ICONS: Record<ModelType, string> = {
  general: 'Brain',
  code: 'Code',
  creative: 'Sparkles',
}

// Tone icons
export const TONE_ICONS: Record<ToneType, string> = {
  formal: 'GraduationCap',
  casual: 'Coffee',
  business: 'Briefcase',
}

/**
 * Send a chat message and receive streaming response
 */
export async function sendChatMessage(
  message: string,
  options: {
    conversationId?: string
    model?: ModelType
    tone?: ToneType
    onToken?: (token: string) => void
    onDone?: (conversationId: string) => void
    onError?: (error: string) => void
  } = {}
): Promise<void> {
  const { conversationId, model = 'general', tone = 'casual', onToken, onDone, onError } = options

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message,
        model,
        tone,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send message')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              onToken?.(parsed.token)
            } else if (parsed.done) {
              onDone?.(parsed.conversationId)
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Get user's conversations
 */
export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch('/api/ai/chat')
  if (!response.ok) throw new Error('Failed to get conversations')
  const data = await response.json()
  return data.conversations
}

/**
 * Get a specific conversation with messages
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await fetch(`/api/ai/chat?conversationId=${conversationId}`)
  if (!response.ok) throw new Error('Failed to get conversation')
  const data = await response.json()
  return data.conversation
}

/**
 * Get a shared conversation by slug
 */
export async function getSharedConversation(shareSlug: string): Promise<Conversation> {
  const response = await fetch(`/api/ai/chat?shareSlug=${shareSlug}`)
  if (!response.ok) throw new Error('Shared conversation not found')
  const data = await response.json()
  return data.conversation
}

/**
 * Share a conversation (generate public link)
 */
export async function shareConversation(conversationId: string): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, action: 'share' }),
  })
  if (!response.ok) throw new Error('Failed to share conversation')
  const data = await response.json()
  return data.url
}

/**
 * Unshare a conversation
 */
export async function unshareConversation(conversationId: string): Promise<void> {
  const response = await fetch('/api/ai/chat', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, action: 'unshare' }),
  })
  if (!response.ok) throw new Error('Failed to unshare conversation')
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`/api/ai/chat?conversationId=${conversationId}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete conversation')
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  const response = await fetch('/api/ai/chat', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, action: 'updateTitle', title }),
  })
  if (!response.ok) throw new Error('Failed to update title')
}

/**
 * Text-to-Speech using Web Speech API
 */
export function speakText(text: string, lang: string = 'bn-BD'): void {
  if (typeof window === 'undefined') return

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.95
  utterance.pitch = 1

  // Try to find a Bengali voice
  const voices = window.speechSynthesis.getVoices()
  const bengaliVoice = voices.find(v => v.lang.startsWith('bn'))
  if (bengaliVoice) {
    utterance.voice = bengaliVoice
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Stop speaking
 */
export function stopSpeaking(): void {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
}

/**
 * Check if browser supports speech synthesis
 */
export function supportsSpeechSynthesis(): boolean {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window
}

/**
 * Check if browser supports speech recognition
 */
export function supportsSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

/**
 * Create speech recognition instance
 */
export function createSpeechRecognizer(): any {
  if (typeof window === 'undefined') return null

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'bn-BD' // Bengali

  return recognition
}

/**
 * Format timestamp for display
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'আজ'
  if (days === 1) return 'গতকাল'
  if (days < 7) return `${days} দিন আগে`

  return d.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })
}

/**
 * Generate a title from the first message
 */
export function generateTitle(message: string): string {
  // Take first 50 chars, remove extra whitespace
  const cleaned = message.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 50) return cleaned
  return cleaned.slice(0, 47) + '...'
}
