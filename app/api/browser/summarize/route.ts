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
      // Free fallback: return extractive summary without LLM so Browser still works with 0 Taka
      const sentences = text.split(/[।.!?]+/).map(s=>s.trim()).filter(Boolean).slice(0, 5);
      const fallback = sentences.map(s=>`- ${s}`).join('\n') || '- (no extractable sentences)';
      return NextResponse.json({ summary: fallback, fallback: true, note: 'Ollama unavailable — extractive fallback' });
    }

    const data = await ollamaResponse.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    return NextResponse.json({ summary: summary || 'No summary generated.' });
  } catch (error: any) {
    const raw = (error as any)?.rawText || ''
    const sentences = (typeof raw === 'string' ? raw : '').split(/[।.!?]+/).map(s=>s.trim()).filter(Boolean).slice(0, 5) as unknown as string[];
    if (sentences.length) return NextResponse.json({ summary: sentences.map(s=>`- ${s}`).join('\n'), fallback: true });
    return NextResponse.json({ error: 'Internal server error', message: (error as any)?.message }, { status: 500 });
  }
}