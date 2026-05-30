'use client'

import { useState } from 'react'
import { Save, Eye, Type, Layers, Image, Palette } from 'lucide-react'
import templates, { VideoTemplate, transitionOptions } from './templates'

type EditorTab = 'templates' | 'text' | 'transitions' | 'preview'

export default function VideoEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>(templates[0])
  const [titleText, setTitleText] = useState('')
  const [subtitleText, setSubtitleText] = useState('')
  const [activeTab, setActiveTab] = useState<EditorTab>('templates')
  const [isExporting, setIsExporting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function handleExport() {
    setIsExporting(true)
    try {
      const res = await fetch('/api/editor/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          title: titleText,
          subtitle: subtitleText,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPreviewUrl(data.previewUrl || null)
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Preview area — 2/3 */}
      <div className="lg:col-span-2">
        <div
          className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ backgroundColor: selectedTemplate.colors.background }}
        >
          {/* Overlay gradient */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `linear-gradient(135deg, ${selectedTemplate.colors.primary}33, ${selectedTemplate.colors.secondary}22)`,
            }}
          />

          {/* Title text */}
          <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{
              textAlign: selectedTemplate.textPosition.align,
              paddingTop: `${selectedTemplate.textPosition.y}%`,
            }}
          >
            <div>
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg"
                style={{
                  color: selectedTemplate.colors.text,
                  fontFamily: selectedTemplate.fonts.heading,
                }}
              >
                {titleText || 'আপনার শিরোনাম'}
              </h2>
              {subtitleText && (
                <p
                  className="text-lg md:text-xl opacity-90"
                  style={{
                    color: selectedTemplate.colors.text,
                    fontFamily: selectedTemplate.fonts.body,
                  }}
                >
                  {subtitleText}
                </p>
              )}
            </div>
          </div>

          {/* Template label */}
          <div className="absolute bottom-3 left-3">
            <span
              className="text-xs px-2 py-1 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: `${selectedTemplate.colors.primary}44`,
                color: selectedTemplate.colors.text,
              }}
            >
              {selectedTemplate.nameBn} · {selectedTemplate.transition}
            </span>
          </div>
        </div>
      </div>

      {/* Controls — 1/3 */}
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[
            { id: 'templates' as EditorTab, icon: Palette, label: 'Templates' },
            { id: 'text' as EditorTab, icon: Type, label: 'Text' },
            { id: 'transitions' as EditorTab, icon: Layers, label: 'Transitions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Templates tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedTemplate.id === t.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <span className="text-xl mb-1 block">{t.icon}</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.nameBn}</p>
              </button>
            ))}
          </div>
        )}

        {/* Text tab */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title Text</label>
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Enter title..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subtitle Text</label>
              <input
                type="text"
                value={subtitleText}
                onChange={(e) => setSubtitleText(e.target.value)}
                placeholder="Enter subtitle..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Transitions tab */}
        {activeTab === 'transitions' && (
          <div className="grid grid-cols-2 gap-2">
            {transitionOptions.map((t) => (
              <button
                key={t.id}
                className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                  selectedTemplate.transition === t.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className="font-medium">{t.label}</p>
                <p className="text-gray-400 dark:text-gray-500">{t.labelBn}</p>
              </button>
            ))}
          </div>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isExporting ? 'Generating Preview...' : 'Generate Preview'}
        </button>
      </div>
    </div>
  )
}
