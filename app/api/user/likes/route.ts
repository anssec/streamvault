import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'

export async function POST(request: NextRequest) {
  // Auth enforced by middleware — double-check here
  if (!request.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { videoId?: string; action?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { videoId, action, sessionId } = body
  // action: 'like' | 'dislike' | 'unlike' | 'undislike'

  if (!videoId || !action || !sessionId) {
    return NextResponse.json({ error: 'Missing params: videoId, action, sessionId required' }, { status: 400 })
  }

  const VALID_ACTIONS = ['like', 'unlike', 'dislike', 'undislike']
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await connectDB()
  const video = await Video.findById(videoId)
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  if (action === 'like') {
    // Remove dislike if exists
    if (video.dislikedBy.includes(sessionId)) {
      video.dislikedBy = video.dislikedBy.filter((id: string) => id !== sessionId)
      video.dislikes = Math.max(0, video.dislikes - 1)
    }
    if (!video.likedBy.includes(sessionId)) {
      video.likedBy.push(sessionId)
      video.likes += 1
    }
  } else if (action === 'unlike') {
    if (video.likedBy.includes(sessionId)) {
      video.likedBy = video.likedBy.filter((id: string) => id !== sessionId)
      video.likes = Math.max(0, video.likes - 1)
    }
  } else if (action === 'dislike') {
    if (video.likedBy.includes(sessionId)) {
      video.likedBy = video.likedBy.filter((id: string) => id !== sessionId)
      video.likes = Math.max(0, video.likes - 1)
    }
    if (!video.dislikedBy.includes(sessionId)) {
      video.dislikedBy.push(sessionId)
      video.dislikes += 1
    }
  } else if (action === 'undislike') {
    if (video.dislikedBy.includes(sessionId)) {
      video.dislikedBy = video.dislikedBy.filter((id: string) => id !== sessionId)
      video.dislikes = Math.max(0, video.dislikes - 1)
    }
  }

  await video.save()

  return NextResponse.json({
    likes: video.likes,
    dislikes: video.dislikes,
    liked: video.likedBy.includes(sessionId),
    disliked: video.dislikedBy.includes(sessionId),
  })
}
