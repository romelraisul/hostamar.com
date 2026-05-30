'use client'

import { useState } from 'react'
import { Clock, Play, FileText, Download } from 'lucide-react'

interface SubtitleSegment {
  start: number
  end: number
  text: string
}

interface SubtitleData {
  id: string
  videoId: string
  language: string
  content: string
  timestamps: SubtitleSegment[]
  createdAt: string
}

export default function SubtitleDisplay({ subtitle, videoTitle }: { subtitle: SubtitleData; videoTitle?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  function handleSegmentClick(index: number) {
    setActiveIndex(index === activeIndex ? null : index)
  }

  function generateSRT(): string {
    return subtitle.timestamps
      .map((seg, i) => {
        const start = formatTime(seg.start).replace('.', ',')
        const end = formatTime(seg.end).replace('.', ',')
        return `${i + 1}\n${start} --> ${end}\n${seg.text}\n\n`
      })
      .join('')
  }

  function handleDownloadSRT() {
    const srt = generateSRT()
    const blob = new Blob([srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subtitles_${subtitle.language}_${subtitle.videoId}.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadText() {
    const blob = new Blob([subtitle.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${subtitle.language}_${subtitle.videoId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {subtitle.language === 'bn' ? 'বাংলা সাবটাইটেল' : 'English Subtitles'}
            </span>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {subtitle.timestamps.length} segments
            </span>
          </div>
          <div className="flex gap-1">
            <button onClick={handleDownloadSRT} title="Download SRT" className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        {videoTitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{videoTitle}</p>}
      </div>

      {/* Full transcript */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{subtitle.content}</p>
        <button onClick={handleDownloadText} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <FileText className="w-3 h-3" /> Download full transcript
        </button>
      </div>

      {/* Segments */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {subtitle.timestamps.map((seg, i) => (
          <button
            key={i}
            onClick={() => handleSegmentClick(i)}
            className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              activeIndex === i ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5 min-w-[60px]">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTime(seg.start)} - {formatTime(seg.end)}
              </span>
              <span className={`text-sm ${activeIndex === i ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                {seg.text}
              </span>
              {activeIndex === i && (
                <Play className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
