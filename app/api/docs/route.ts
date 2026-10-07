import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docs?lang=bn — serve the pre-rendered docs content JSON.
 * Static files stay OUT of the JS bundle (2.5MB EN payload would blow the
 * serverless asset limit); the page fetches this instead.
 */
export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get('lang') === 'bn' ? 'bn' : 'en'
  // Content moved to a static asset (public/docs-content-*.json) — workerd has no
  // fs, so readFileSync always threw here and the docs page got {"sections":[]}.
  // Same URL contract kept: redirect to the asset.
  return NextResponse.redirect(new URL(`/docs-content-${lang}.json`, req.url), 302)
}
