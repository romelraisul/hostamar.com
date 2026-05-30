import { NextRequest, NextResponse } from 'next/server';

const store = new Map<string, number[]>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60000;

export async function GET(req: NextRequest) {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = store.get(ip) || [];
  timestamps = timestamps.filter((ts) => ts > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    const retryAfterSec = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

    return NextResponse.json(
      { error: 'Too Many Requests', retryAfter: retryAfterSec },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(oldestInWindow + WINDOW_MS),
        },
      }
    );
  }

  timestamps.push(now);
  store.set(ip, timestamps);

  return NextResponse.json(
    {
      message: 'Rate limit test',
      requestsMade: timestamps.length,
      requestsRemaining: MAX_REQUESTS - timestamps.length,
      windowMs: WINDOW_MS,
      maxRequests: MAX_REQUESTS,
    },
    {
      headers: {
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': String(MAX_REQUESTS - timestamps.length),
        'X-RateLimit-Reset': String(now + WINDOW_MS),
      },
    }
  );
}
