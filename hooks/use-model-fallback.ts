'use client'

import { useState, useCallback } from 'react'

interface ModelResponse {
  success: boolean
  response?: string
  model?: string
  attempts?: number
  error?: string
}

interface UseModelFallbackOptions {
  maxRetries?: number
  onSuccess?: (response: string, model: string) => void
  onError?: (error: string) => void
}

export function useModelFallback(options: UseModelFallbackOptions = {}) {
  const { maxRetries = 3, onSuccess, onError } = options
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastModel, setLastModel] = useState<string | null>(null)

  const generate = useCallback(
    async (prompt: string): Promise<ModelResponse> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, maxRetries }),
        })

        const data: ModelResponse = await response.json()

        if (data.success && data.response) {
          setLastModel(data.model || null)
          onSuccess?.(data.response, data.model || '')
          return data
        } else {
          const errorMsg = data.error || 'Failed to generate response'
          setError(errorMsg)
          onError?.(errorMsg)
          return { success: false, error: errorMsg }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Network error'
        setError(errorMsg)
        onError?.(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    [maxRetries, onSuccess, onError]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generate,
    isLoading,
    error,
    lastModel,
    clearError,
  }
}
