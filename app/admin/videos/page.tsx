'use client'

import { useEffect, useState } from 'react'
import { Video, Play, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

interface VideoItem {
  id: string
  title: string
  topic: string
  status: string
  customerEmail: string
  createdAt: string
}

interface QueueItem {
  id: string
  topic: string
  priority: number
  status: string
  attempts: number
  customerEmail: string
  createdAt: string
}

export default function AdminVideosPage() {
  const { t } = useLocale()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'videos' | 'queue'>('queue')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/videos')
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos)
        setQueue(data.queue)
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateQueueStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/videos/queue/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to update queue status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700 border-green-200'
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'failed': return 'bg-red-100 text-red-700 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Video Management</h1>
          <p className="text-gray-500 mt-1">Manage video generation and queue</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white'
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          Processing Queue ({queue.filter(q => q.status === 'pending' || q.status === 'processing').length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'videos'
              ? 'bg-blue-600 text-white'
              : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Videos ({videos.length})
        </button>
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {queue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queue.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`font-medium ${item.priority <= 2 ? 'text-red-600' : item.priority <= 4 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.topic}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">{item.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">{item.attempts}/3</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => updateQueueStatus(item.id, 'processing')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Start Processing"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {item.status === 'processing' && (
                            <button
                              onClick={() => updateQueueStatus(item.id, 'completed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Mark Completed"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {(item.status === 'pending' || item.status === 'processing') && (
                            <button
                              onClick={() => updateQueueStatus(item.id, 'failed')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Mark Failed"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No videos in queue</p>
            </div>
          )}
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {videos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Video className="w-5 h-5 text-gray-500" />
                          </div>
                          <p className="font-medium text-gray-900">{video.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">{video.topic}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">{video.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(video.status)}`}>
                          {video.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No videos found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}