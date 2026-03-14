import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth enforced by middleware — double-check here
  if (!request.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()
  const video = await Video.findById(id).select('url extension').lean()
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const upstreamHeaders: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (compatible; StreamVault/1.0)',
  }
  const range = request.headers.get('range')
  if (range) upstreamHeaders['Range'] = range

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)

    const upstream = await fetch(video.url, {
      headers: upstreamHeaders,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: `Upstream server returned ${upstream.status}` },
        { status: 502 }
      )
    }

    const responseHeaders = new Headers()
    const passThrough = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'last-modified', 'etag',
    ]
    passThrough.forEach(h => {
      const val = upstream.headers.get(h)
      if (val) responseHeaders.set(h, val)
    })
    // Private cache only — never store in shared caches
    responseHeaders.set('cache-control', 'private, no-store')
    // Prevent MIME sniffing
    responseHeaders.set('x-content-type-options', 'nosniff')

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Stream request timed out' }, { status: 504 })
    }
    console.error('Stream proxy error:', err)
    return NextResponse.json({ error: 'Stream unavailable' }, { status: 502 })
  }
}
