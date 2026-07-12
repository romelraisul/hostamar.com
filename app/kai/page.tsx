import { readFileSync } from 'fs'
import path from 'path'
import DevChat from '@/components/dev-chat'

// Backend/Docker page: reads a file from the local filesystem at render time.
// force-dynamic so Vercel's serverless build never statically evaluates the
// filesystem read (which would crash the shared Lambda / other routes). On the
// Docker API backend this renders normally; on Vercel it degrades gracefully.
export const dynamic = 'force-dynamic'

export default function KaiPage() {
  let tasks = ''
  try {
    const tasksPath = path.join(process.cwd(), 'product-tasks', 'kai-tasks.md')
    tasks = readFileSync(tasksPath, 'utf-8')
  } catch {
    tasks = '(tasks file not available in this environment)'
  }

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
