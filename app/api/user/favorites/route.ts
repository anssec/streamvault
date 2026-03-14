import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'

export async function POST(request: NextRequest) {
  // Auth enforced by middleware — double-check here
  if (!request.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { videoId?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { videoId, sessionId } = body
  if (!videoId || !sessionId) {
    return NextResponse.json({ error: 'Missing params: videoId and sessionId required' }, { status: 400 })
  }

  await connectDB()
  const video = await Video.findById(videoId)
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const isFav = video.favoritedBy.includes(sessionId)
  if (isFav) {
    video.favoritedBy = video.favoritedBy.filter((id: string) => id !== sessionId)
  } else {
    video.favoritedBy.push(sessionId)
  }
  await video.save()

  return NextResponse.json({ favorited: !isFav })
}
