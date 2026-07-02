import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

function sanitizeRedirectUrl(raw: string): { url: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: '', error: 'URL is required' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: '', error: 'Malformed URL' };
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { url: '', error: 'Unsupported protocol' };
  }
  return { url: parsed.href };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const raw = searchParams.get('url') || '';
    const sanitized = sanitizeRedirectUrl(raw);

    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const targetUrl = sanitized.url;

    const fetchPromise = fetch(targetUrl, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      // Keep reasonable timeout to avoid runaway requests
      signal: AbortSignal.timeout(15000),
    }).catch(() => undefined);

    const response = await fetchPromise;
    if (!response) {
      return NextResponse.json({ error: 'Upstream website unreachable' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';

    let body: ArrayBuffer;
    try {
      body = await response.arrayBuffer();
    } catch {
      return NextResponse.json({ error: 'Failed to read upstream response' }, { status: 502 });
    }

    if (!contentType.includes('text/html')) {
      return new NextResponse(Buffer.from(body), {
        status: response.status,
        headers: {
          'content-type': contentType || 'application/octet-stream',
          'x-proxy-source': targetUrl,
        },
      });
    }

    let html = Buffer.from(body).toString('utf8');

    const injectBase = () => {
      const marker = '<base href="';
      if (html.includes(marker)) return;

      const headCloseIndex = html.indexOf('</head>');
      if (headCloseIndex !== -1) {
        const injection = `<base href="${targetUrl.replace(/\/$/, '')}" target="_blank">`;
        html = html.slice(0, headCloseIndex) + injection + html.slice(headCloseIndex);
      }
    };

    const injectSecurityHeaders = () => {
      const metaTag = `<meta name="referrer" content="no-referrer" />`;
      const headCloseIndex = html.indexOf('</head>');
      if (headCloseIndex !== -1 && !html.includes('name="referrer"')) {
        html = html.slice(0, headCloseIndex) + metaTag + html.slice(headCloseIndex);
      }
    };

    injectBase();
    injectSecurityHeaders();

    return new NextResponse(html, {
      status: response.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-frame-options': 'ALLOWALL',
        'content-security-policy': "frame-ancestors 'self' *;",
        'x-proxy-source': targetUrl,
      },
    });
  } catch (error: any) {
    console.error('Browser proxy error:', error);
    return NextResponse.json({ error: 'Proxy error', message: error?.message }, { status: 500 });
  }
}
