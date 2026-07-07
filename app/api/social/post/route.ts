import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// ─── OAuth 1.0a Twitter signing ─────────────────────────────────────────────
function oauth1Sign(
  method: string, url: string, params: Record<string, string>, secrets: { ck: string; cks: string; at: string; ats: string }
) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: secrets.ck,
    oauth_token: secrets.at,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  }
  const allParams = { ...params, ...oauthParams }
  const sorted = Object.keys(allParams).sort()
  const sigBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sorted.map(k => `${k}=${allParams[k]}`).join('&')),
  ].join('&')
  const key = `${encodeURIComponent(secrets.cks)}&${encodeURIComponent(secrets.ats)}`
  const sig = crypto.createHmac('sha1', key).update(sigBase).digest('base64')
  oauthParams.oauth_signature = sig
  return 'OAuth ' + Object.keys(oauthParams).sort().map(
    k => `${k}="${encodeURIComponent(oauthParams[k])}"`
  ).join(', ')
}

// Facebook Graph API Auto-Post
async function postToFacebook(message: string, imageUrl?: string) {
  try {
    const pageId = process.env.FB_PAGE_ID
    const accessToken = process.env.FB_ACCESS_TOKEN

    if (!pageId || !accessToken) {
      console.warn('Facebook credentials not configured')
      return { success: false, error: 'Facebook not configured' }
    }

    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`

    const params = new URLSearchParams()
    params.append('message', message)
    params.append('access_token', accessToken)
    if (imageUrl) params.append('url', imageUrl)

    const response = await fetch(endpoint, {
      method: 'POST',
      body: params
    })

    const data = await response.json()
    return { success: !!data.id, data }
  } catch (error) {
    console.error('Facebook post error:', error)
    return { success: false, error: String(error) }
  }
}

// Twitter/X Auto-Post via OAuth 1.0a (user-context, allows posting)
async function postToTwitter(message: string) {
  try {
    const ck = process.env.TWITTER_CONSUMER_KEY
    const cks = process.env.TWITTER_CONSUMER_SECRET
    const at = process.env.TWITTER_ACCESS_TOKEN
    const ats = process.env.TWITTER_ACCESS_TOKEN_SECRET
    if (!ck || !cks || !at || !ats) {
      console.warn('Twitter OAuth 1.0a credentials not configured')
      return { success: false, error: 'Twitter not configured' }
    }

    const url = 'https://api.twitter.com/2/tweets'
    const secrets = { ck, cks, at, ats }
    const authHeader = oauth1Sign('POST', url, { text: message.substring(0, 280) }, secrets)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Hostamar/1.0',
      },
      body: JSON.stringify({ text: message.substring(0, 280) }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Twitter API error:', data)
    }
    return { success: response.ok, data }
  } catch (error) {
    console.error('Twitter post error:', error)
    return { success: false, error: String(error) }
  }
}

// LinkedIn Auto-Post
async function postToLinkedIn(message: string) {
  try {
    const token = process.env.LINKEDIN_ACCESS_TOKEN
    const personId = process.env.LINKEDIN_PERSON_ID

    if (!token || !personId) {
      console.warn('LinkedIn credentials not configured')
      return { success: false, error: 'LinkedIn not configured' }
    }

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: message },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      })
    })

    const data = await response.json()
    return { success: response.ok, data }
  } catch (error) {
    console.error('LinkedIn post error:', error)
    return { success: false, error: String(error) }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, platforms, videoId, videoTitle } = await request.json()

    if (!message || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const results: any = {}

    // Post to selected platforms
    if (platforms.includes('facebook')) {
      results.facebook = await postToFacebook(message)
    }
    if (platforms.includes('twitter')) {
      // Truncate for Twitter's character limit
      const twitterMsg = videoTitle
        ? `${videoTitle} — ${message}`.substring(0, 280)
        : message.substring(0, 280)
      results.twitter = await postToTwitter(twitterMsg)
    }
    if (platforms.includes('linkedin')) {
      results.linkedin = await postToLinkedIn(message)
    }

    // Log post activity
    await prisma.notification.create({
      data: {
        customerId: user.id,
        type: 'SOCIAL_POST' as any,
        title: '🔗 সোশ্যাল মিডিয়ায় পোস্ট পাঠানো হয়েছে',
        message: `প্ল্যাটফর্ম: ${platforms.join(', ')}`,
        actionUrl: videoId ? `/gallery/${videoId}` : undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: 'সোশ্যাল মিডিয়ায় পোস্ট পাঠানো হয়েছে',
      results
    })
  } catch (error) {
    console.error('Social post error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Get social accounts status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fbConnected = !!process.env.FB_PAGE_ID && !!process.env.FB_ACCESS_TOKEN
    const twitterConnected = !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_ACCESS_TOKEN)
    const linkedinConnected = !!process.env.LINKEDIN_ACCESS_TOKEN && !!process.env.LINKEDIN_PERSON_ID

    return NextResponse.json({
      success: true,
      data: {
        facebook: { connected: fbConnected, page: process.env.FB_PAGE_NAME || null },
        twitter: { connected: twitterConnected, handle: process.env.TWITTER_HANDLE || null },
        linkedin: { connected: linkedinConnected, profile: process.env.LINKEDIN_PROFILE || null }
      }
    })
  } catch (error) {
    console.error('Social status error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}