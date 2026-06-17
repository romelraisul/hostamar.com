'use client'

import { useState, useEffect } from 'react'
import { useModelFallback } from '@/hooks/use-model-fallback'

interface Model {
  name: string
  priority: number
  type: string
  endpoint: string
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [currentModel, setCurrentModel] = useState<Model | null>(null)
  const [testPrompt, setTestPrompt] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const { generate, isLoading, error, lastModel } = useModelFallback()

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/model')
      const data = await response.json()
      setModels(data.models)
      setCurrentModel(data.currentModel)
    } catch (err) {
      console.error('Failed to fetch models:', err)
    }
  }

  const handleTestModel = async () => {
    if (!testPrompt.trim()) return

    setTestResult(null)
    const result = await generate(testPrompt)
    if (result.success && result.response) {
      setTestResult(result.response)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Models</h1>
          <p className="text-gray-500">Manage and test AI models with automatic fallback</p>
        </div>
      </div>

      {/* Current Model */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Model</h2>
        {currentModel ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">AI</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{currentModel.name}</p>
              <p className="text-sm text-gray-500">Priority: {currentModel.priority} | Type: {currentModel.type}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>

      {/* Available Models */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Models</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Priority</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{model.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{model.priority}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {model.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {currentModel?.name === model.name ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Standby
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Model */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Model</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Prompt
            </label>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          <button
            onClick={handleTestModel}
            disabled={isLoading || !testPrompt.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Model'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {testResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 mb-2">
                Response from: <span className="font-medium">{lastModel}</span>
              </p>
              <p className="text-gray-900">{testResult}</p>
            </div>
          )}
        </div>
      </div>

      {/* Fallback Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fallback Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Consecutive Failures
            </label>
            <input
              type="number"
              defaultValue={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Retries per Request
            </label>
            <input
              type="number"
              defaultValue={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
