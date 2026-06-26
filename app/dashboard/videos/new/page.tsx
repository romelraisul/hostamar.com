"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // API call to video generation endpoint
    setTimeout(() => setLoading(false), 3000)
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>নতুন ভিডিও তৈরি করুন</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                আপনার ভিডিও সম্পর্কে বর্ণনা দিন (বাংলা/ইংরেজি)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="উদাহরণ: একটি রঙিন ইসলামিক নতুন বছরের ভিডিও..."
                className="w-full h-32 p-3 border rounded-lg"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'ভিডিও তৈরি হচ্ছে...' : 'ভিডিও তৈরি করুন'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}