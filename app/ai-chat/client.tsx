'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat/ChatInterface'
import VideoContext from '@/components/chat/VideoContext'

export default function AiChatClient() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('')

  function handleSelectVideo(id: string | null, title: string) {
    setSelectedVideoId(id || null)
    setSelectedVideoTitle(title)
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Video sidebar */}
      <div className="lg:col-span-1">
        <VideoContext
          selectedVideoId={selectedVideoId}
          onSelectVideo={handleSelectVideo}
        />
      </div>

      {/* Chat */}
      <div className="lg:col-span-3">
        <ChatInterface
          videoId={selectedVideoId}
          videoTitle={selectedVideoTitle}
        />
      </div>
    </div>
  )
}
