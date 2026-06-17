// Cloudflare Worker for Edge Caching
// Deploy with: wrangler deploy

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const cacheKey = new Request(url.toString(), request)
    
    // Check cache first
    const cache = caches.default
    let response = await cache.match(cacheKey)
    
    if (response) {
      return response
    }
    
    // Fetch from origin
    response = await fetch(request)
    
    // Cache static assets for 1 year
    if (isStaticAsset(url.pathname)) {
      const cacheResponse = new Response(response.body, response)
      cacheResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()))
      return cacheResponse
    }
    
    // Cache HTML for 5 minutes
    if (isHtmlResponse(response)) {
      const cacheResponse = new Response(response.body, response)
      cacheResponse.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
      ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()))
      return cacheResponse
    }
    
    return response
  }
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ico|woff2)$/i.test(pathname)
}

function isHtmlResponse(response) {
  const contentType = response.headers.get('content-type')
  return contentType?.includes('text/html') ?? false
}