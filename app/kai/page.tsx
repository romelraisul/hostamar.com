import { readFileSync } from 'fs'
import path from 'path'
import DevChat from '@/components/dev-chat'

export default function KaiPage() {
  const tasksPath = path.join(process.cwd(), 'product-tasks', 'kai-tasks.md')
  const tasks = readFileSync(tasksPath, 'utf-8')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">Hostamar Kai</h1>
        <p className="mt-2 text-gray-600">Developer-facing AI assistant for Hostamar product teams.</p>
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-800">Tasks</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm text-gray-800">
            {tasks}
          </pre>
        </div>
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
          <DevChat tool="kai" />
        </div>
      </div>
    </div>
  )
}
