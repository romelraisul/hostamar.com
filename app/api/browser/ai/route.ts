import { NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: Request) {
  try {
    const { url, lang, task } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the webpage content
    let pageText = ''
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HostamarBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      })
      const html = await response.text()
      // Simple text extraction - remove scripts, styles, and HTML tags
      pageText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)
    } catch {
      return NextResponse.json({ error: 'Failed to fetch the URL. The site may be blocking requests.' }, { status: 422 })
    }

    if (pageText.length < 100) {
      return NextResponse.json({ error: 'Not enough text content found on the page' }, { status: 422 })
    }

    const targetLang = lang === 'bangla' ? 'ben_Beng' : 'eng_Latn'

    if (task === 'translate') {
      const model = 'facebook/nllb-200-distilled-600M'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output = await (replicate.run as any)(model, {
        input: {
          src_lang: 'eng_Latn',
          tgt_lang: targetLang,
          text: pageText.slice(0, 5000),
        },
      })

      return NextResponse.json({
        success: true,
        result: String(output),
        model,
        charsProcessed: pageText.length,
      })
    }

    // Summarize using BART
    const model = 'facebook/bart-large-cnn'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOutput = await (replicate.run as any)(model, {
      input: {
        inputs: pageText.slice(0, 8000),
        parameters: {
          min_length: 50,
          max_length: 300,
        },
      },
    })

    const summaryText = Array.isArray(rawOutput) ? String(rawOutput[0]) : String(rawOutput)

    // Translate summary to Bangla if requested
    if (lang === 'bangla') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const translated = await (replicate.run as any)('facebook/nllb-200-distilled-600M', {
        input: {
          src_lang: 'eng_Latn',
          tgt_lang: 'ben_Beng',
          text: summaryText,
        },
      })

      return NextResponse.json({
        success: true,
        result: String(translated),
        summaryEn: summaryText,
        model: 'facebook/bart-large-cnn + facebook/nllb-200-distilled-600M',
        charsProcessed: pageText.length,
      })
    }

    return NextResponse.json({
      success: true,
      result: summaryText,
      model,
      charsProcessed: pageText.length,
    })
  } catch (error) {
    console.error('Browser AI error:', error)
    return NextResponse.json(
      { error: 'AI processing failed. Please try again or use a different URL.' },
      { status: 500 }
    )
  }
}
