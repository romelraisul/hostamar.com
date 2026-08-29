export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')) return true;
  if (h === '169.254.169.254' || h === 'metadata.google.internal') return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.match(/^172\.(1[6-9]|2\d|3[0-1])\./)) return true;
  if (h === '0.0.0.0') return true;
  return false;
}
;

export async function POST(request: NextRequest) {
  const _auth = await getAuthUser(request);
  if (!_auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      // ZERO-COST DYNAMIC FALLBACK: home Ollama down (computer off) →
      // always-on ai-fallback chain (kilocode → CF edge → ... → knowledge-base).
      try {
        const { callBestModel } = await import('@/lib/ai-fallback')
        const r = await callBestModel(
          [{ role: 'user', content: prompt }],
          'You are a concise page summarizer. Be factual and structured.',
        )
        return NextResponse.json({ summary: r.text || 'No summary generated.', provider: r.provider, model: r.model })
      } catch {
        return NextResponse.json(
          { error: 'AI service unavailable', detail: 'Ollama unavailable' },
          { status: 502 }
        )
      }
    }

    const data = await ollamaResponse.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    return NextResponse.json({ summary: summary || 'No summary generated.' });
  } catch (error: any) {
    console.error('Browser summarize error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}