import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const DMR_BASE_URL = 'http://localhost:12434/engines/v1'
const OLLAMA_URL = 'http://localhost:11434/v1'

interface AgentTask {
  id: string
  agent: string
  task: string
  model: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
}

const AGENTS = [
  { name: 'ceo', model: 'qwen3.6:27B', description: 'CEO - orchestrates all agents, makes strategic decisions' },
  { name: 'marketing', model: 'smollm3:F16', description: 'Marketing - campaigns, content, social media' },
  { name: 'devops', model: 'smollm3:F16', description: 'DevOps - infrastructure, deployments, monitoring' },
  { name: 'support', model: 'smollm3:F16', description: 'Support - customer inquiries, troubleshooting' },
  { name: 'analytics', model: 'qwen3.6:27B', description: 'Analytics - data analysis, metrics, reports' },
  { name: 'content', model: 'smollm3:F16', description: 'Content - blog posts, video scripts, copywriting' },
]

async function callModel(model: string, messages: { role: string; content: string }[]): Promise<string> {
  const url = `${DMR_BASE_URL}/chat/completions`
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    // Fallback to Ollama
    const ollamaRes = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'hermes3',
        messages,
        temperature: 0.5,
        max_tokens: 2000,
      }),
    })
    if (!ollamaRes.ok) throw new Error(`All models failed`)
    const ollamaData = await ollamaRes.json()
    return ollamaData.choices?.[0]?.message?.content || ''
  }
  
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'localhost'
  const { allowed } = rateLimit(`automation:${ip}`, 10, 60000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { task, agent: targetAgent } = await request.json()
    
    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 })
    }

    const tasks: AgentTask[] = []

    if (targetAgent && targetAgent !== 'all') {
      // Single agent execution
      const agent = AGENTS.find(a => a.name === targetAgent)
      if (!agent) return NextResponse.json({ error: `Agent '${targetAgent}' not found` }, { status: 400 })

      tasks.push({
        id: Date.now().toString(),
        agent: agent.name,
        task,
        model: agent.model,
        status: 'running',
      })

      try {
        const result = await callModel(agent.model, [
          { role: 'system', content: `You are the ${agent.description}. Execute this task professionally.` },
          { role: 'user', content: task },
        ])
        tasks[0].status = 'completed'
        tasks[0].result = result
      } catch (err) {
        tasks[0].status = 'failed'
        tasks[0].error = err instanceof Error ? err.message : 'Execution failed'
      }

      return NextResponse.json({
        success: true,
        orchestrated: false,
        agent: targetAgent,
        tasks,
      })
    }

    // CEO orchestrates all agents
    // Step 1: CEO analyzes the task
    tasks.push({
      id: (Date.now() + 1).toString(),
      agent: 'ceo',
      task: `Analyze and delegate: ${task}`,
      model: 'qwen3.6:27B',
      status: 'running',
    })

    let analysis: string
    try {
      analysis = await callModel('qwen3.6:27B', [
        { role: 'system', content: 'You are the Hostamar CEO AI. Analyze business tasks and delegate to agents: marketing, devops, support, analytics, content. Provide a structured plan with specific instructions for each agent.' },
        { role: 'user', content: task },
      ])
      tasks[0].status = 'completed'
      tasks[0].result = analysis
    } catch (err) {
      tasks[0].status = 'failed'
      tasks[0].error = err instanceof Error ? err.message : 'Analysis failed'
      return NextResponse.json({ success: true, orchestrated: true, tasks })
    }

    // Step 2: Execute agent subtasks in parallel
    const agentResults = await Promise.all(
      AGENTS.filter(a => a.name !== 'ceo').map(async (agent) => {
        const agentTask: AgentTask = {
          id: (Date.now() + 2 + Math.random()).toString(),
          agent: agent.name,
          task: `Based on CEO analysis, execute your part: ${analysis.substring(0, 2000)}`,
          model: agent.model,
          status: 'running',
        }
        
        try {
          const result = await callModel(agent.model, [
            { role: 'system', content: `You are the ${agent.description}. Report back with concrete actions.` },
            { role: 'user', content: agentTask.task },
          ])
          agentTask.status = 'completed'
          agentTask.result = result
        } catch (err) {
          agentTask.status = 'failed'
          agentTask.error = err instanceof Error ? err.message : 'Agent failed'
        }
        
        return agentTask
      })
    )

    tasks.push(...agentResults)

    // Step 3: CEO summarizes
    const summaryPrompt = `Summarize the results of this automated task execution. 
CEO Analysis: ${analysis}
Agent Results: ${agentResults.map(t => `${t.agent}: ${t.status === 'completed' ? 'Done' : 'Failed'}`).join(', ')}

Provide a concise executive summary.`

    let summary: string
    try {
      summary = await callModel('qwen3.6:27B', [
        { role: 'system', content: 'You are the Hostamar CEO AI. Provide concise executive summaries of automated task execution.' },
        { role: 'user', content: summaryPrompt },
      ])
    } catch {
      summary = 'Summary unavailable due to model error.'
    }

    return NextResponse.json({
      success: true,
      orchestrated: true,
      summary,
      tasks,
    })
  } catch (error) {
    console.error('Automation error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Automation failed',
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    agents: AGENTS,
    defaultModel: 'qwen3.6:27B',
    endpoints: {
      dmr: DMR_BASE_URL,
      ollama: OLLAMA_URL,
    },
  })
}