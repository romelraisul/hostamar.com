export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, url } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Provide page text to summarize (min 20 characters).' },
        { status: 400 }
      );
    }

    const prompt = `Summarize the following web page content into 5-8 concise bullet points. Preserve key facts, numbers, and action items. If content is sponsored or marketing-heavy, distinguish that.\n\nURL: ${url || 'unknown'}\n\nCONTENT:\n${text.slice(0, 14000)}`;

    const ollamaResponse = await fetch(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'qwen3.6:latest',
        messages: [
          { role: 'system', content: 'You are a concise summarizer. Be factual and structured.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.4,
        max_tokens: 900,
      }),
    });

    if (!ollamaResponse.ok) {
      const detail = await ollamaResponse.text().catch(() => 'Ollama unavailable');
      return NextResponse.json(
        { error: 'AI service unavailable', detail },
        { status: 502 }
      );
    }

    const data = await ollamaResponse.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    return NextResponse.json({ summary: summary || 'No summary generated.' });
  } catch (error: any) {
    console.error('Browser summarize error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}