"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function NewVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdVideo, setCreatedVideo] = useState<{id: string, title: string} | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/dashboard/videos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: prompt.slice(0, 100), 
          topic: prompt, 
          description: prompt,
          language: 'bn' 
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create video')
      }
      
      setCreatedVideo({ id: data.video.id, title: data.video.title })
      setPrompt('')
    } catch (err: any) {
      setError(err.message || 'Failed to create video')
    } finally {
      setLoading(false)
    }
  }

  const handleGoToVideos = () => {
    router.push('/dashboard/videos')
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">নতুন ভিডিও তৈরি করুন</h1>
        <p className="text-gray-500 mt-1">আপনার ভিডিও আইডিয়া লিখুন, আমরা বাকিটা করব</p>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {createdVideo && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">ভিডিও তৈরি হচ্ছে!</p>
          <p className="text-sm text-green-700 mt-1">ভিডিও আইডি: {createdVideo.id}</p>
          <p className="text-xs text-green-600 mt-1">এটি প্রসেসিং কিউতে যোগ করা হয়েছে। কিছুক্ষণ পর ড্যাশবোর্ডে দেখতে পাবেন।</p>
          <button 
            onClick={handleGoToVideos}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            ভিডিও লিস্ট দেখুন
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            আপনার ভিডিও সম্পর্কে বর্ণনা দিন (বাংলা/ইংরেজি)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="উদাহরণ: একটি রঙিন ইসলামিক নতুন বছরের ভিডিও..."
            className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !prompt.trim()}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'ভিডিও তৈরি হচ্ছে...' : 'ভিডিও তৈরি করুন'}
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          ভিডিও প্রসেসিং কিছুক্ষণ লাগতে পারে। তৈরি হলে ড্যাশবোর্ডে দেখা যাবে।
        </p>
      </form>
    </div>
  )
}