import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// Routes that never need auth
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout']

// Blocked bot/crawler user-agent patterns
const BLOCKED_UA = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /wget/i, /curl/i,
  /scrapy/i, /python-requests/i, /python-urllib/i, /axios/i,
  /go-http/i, /java\//i, /libwww/i, /lwp-trivial/i, /urllib/i,
  /httpunit/i, /nutch/i, /phpcrawl/i, /msnbot/i, /bingbot/i,
  /googlebot/i, /yandexbot/i, /baiduspider/i, /duckduckbot/i,
  /facebot/i, /ia_archiver/i, /semrushbot/i, /ahrefsbot/i,
  /dotbot/i, /rogerbot/i, /exabot/i, /blexbot/i, /seznambot/i,
  /petalbot/i, /applebot/i, /dataforseobot/i, /claudebot/i,
  /gptbot/i, /ccbot/i, /bytespider/i, /imagesift/i, /omgili/i,
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ua = request.headers.get('user-agent') || ''
  const isApiRoute = pathname.startsWith('/api/')

  // ── 1. Block all bots / scrapers ─────────────────────────────────────────
  if (BLOCKED_UA.some(p => p.test(ua))) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'content-type': 'text/plain' },
    })
  }

  // ── 2. Block empty User-Agent (curl, raw scripts) ─────────────────────────
  if (!ua.trim()) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'content-type': 'text/plain' },
    })
  }

  // ── 3. Allow public paths ─────────────────────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next())
  }

  // ── 4. Allow Next.js internals and static files ───────────────────────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // ── 5. Verify JWT ─────────────────────────────────────────────────────────
  const token = request.cookies.get('sv_token')?.value

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized — please log in' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const payload = await verifyToken(token)

  if (!payload) {
    // Token invalid or expired — clear it
    if (isApiRoute) {
      const res = NextResponse.json(
        { error: 'Session expired — please log in again' },
        { status: 401 }
      )
      res.cookies.set('sv_token', '', { maxAge: 0, path: '/' })
      return res
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.cookies.set('sv_token', '', { maxAge: 0, path: '/' })
    return res
  }

  // ── 6. Admin-only routes ──────────────────────────────────────────────────
  const ADMIN_PATHS = ['/admin', '/api/crawl', '/api/users']
  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && payload.role !== 'admin') {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/browse'
    return NextResponse.redirect(url)
  }

  // ── 7. Pass user info to API handlers via headers ─────────────────────────
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-role', payload.role)

  return addSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } })
  )
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
