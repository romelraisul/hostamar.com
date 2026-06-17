import { NextRequest, NextResponse } from 'next/server'

const MODELS = [
  { name: 'qwen3.6:27B', priority: 1, type: 'local', endpoint: 'http://localhost:1234' },
  { name: 'smollm3:F16', priority: 2, type: 'local', endpoint: 'http://localhost:1234' },
  { name: 'gpt-4o-mini', priority: 3, type: 'openai', endpoint: 'https://api.openai.com' },
  { name: 'gpt-3.5-turbo', priority: 4, type: 'openai', endpoint: 'https://api.openai.com' },
]

let currentModelIndex = 0
let consecutiveFailures = 0
const MAX_CONSECUTIVE_FAILURES = 3

function testModelResponse(response: string, prompt: string): boolean {
  const failurePatterns = [
    'I cannot',
    "I don't have",
    "I'm not able",
    "I'm unable",
    'Error:',
    'Failed to',
    'Unable to process',
    'Model is not available',
    'Connection refused',
    'Timeout',
  ]

  for (const pattern of failurePatterns) {
    if (response.includes(pattern)) {
      return false
    }
  }

  const hallucinationPatterns = [
    'As an AI language model',
    "I'm a large language model",
    'My training data',
    'I was trained by',
    'My knowledge cutoff',
  ]

  for (const pattern of hallucinationPatterns) {
    if (response.includes(pattern)) {
      return false
    }
  }

  if (response.length < 10) {
    return false
  }

  return true
}

async function callModel(model: typeof MODELS[0], prompt: string): Promise<string> {
  if (model.type === 'local') {
    try {
      const response = await fetch(`${model.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      throw new Error(`Local model error: ${error}`)
    }
  }

  throw new Error(`Model type ${model.type} not configured`)
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, maxRetries = 3 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    let attempts = 0
    let modelIndex = currentModelIndex

    while (attempts < maxRetries && modelIndex < MODELS.length) {
      const model = MODELS[modelIndex]
      console.log(`Attempting with model: ${model.name}`)

      try {
        const response = await callModel(model, prompt)

        if (testModelResponse(response, prompt)) {
          console.log(`Success with model: ${model.name}`)
          consecutiveFailures = 0
          return NextResponse.json({
            success: true,
            response,
            model: model.name,
            attempts: attempts + 1,
          })
        } else {
          console.log(`Model ${model.name} failed or hallucinated`)
          consecutiveFailures++

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log('Too many consecutive failures, switching to next model')
            modelIndex++
            consecutiveFailures = 0
          }
        }
      } catch (error) {
        console.error(`Error with model ${model.name}:`, error)
        modelIndex++
      }

      attempts++
    }

    return NextResponse.json(
      {
        success: false,
        error: 'All models failed',
        modelsAttempted: MODELS.slice(0, modelIndex + 1).map((m) => m.name),
      },
      { status: 500 }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    models: MODELS,
    currentModel: MODELS[currentModelIndex],
    consecutiveFailures,
  })
}
