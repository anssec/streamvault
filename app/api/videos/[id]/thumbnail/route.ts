import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/videos/[id]/thumbnail ───────────────────────────────────────────
// Returns the stored thumbnail data-URL, or 404 if not yet generated.
export async function GET(req: NextRequest, { params }: Params) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await connectDB()

  const video = await Video.findById(id).select('thumbnail').lean()
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!video.thumbnail) {
    return NextResponse.json({ thumbnail: null }, { status: 404 })
  }

  return NextResponse.json({ thumbnail: video.thumbnail })
}

// ── POST /api/videos/[id]/thumbnail ──────────────────────────────────────────
// Saves a base64 JPEG data-URL thumbnail.
// Only writes if the video has no thumbnail yet (first-write-wins).
export async function POST(req: NextRequest, { params }: Params) {
  if (!req.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let thumbnail: string
  try {
    const body = await req.json()
    thumbnail = body.thumbnail
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof thumbnail !== 'string' ||
    !thumbnail.startsWith('data:image/') ||
    thumbnail.length < 500      // sanity check — blank canvas is much smaller
  ) {
    return NextResponse.json({ error: 'Invalid thumbnail data' }, { status: 400 })
  }

  // Rough size guard — JPEG at 480×270 @75% quality is usually 15–60 KB.
  // Reject anything over 200 KB to prevent DB bloat.
  const approxBytes = Math.ceil((thumbnail.length * 3) / 4)
  if (approxBytes > 200_000) {
    return NextResponse.json({ error: 'Thumbnail too large' }, { status: 413 })
  }

  await connectDB()

  // Only set if not already present — avoids redundant writes
  const updated = await Video.findOneAndUpdate(
    { _id: id, $or: [{ thumbnail: { $exists: false } }, { thumbnail: '' }] },
    { $set: { thumbnail } },
    { new: true, select: 'thumbnail' }
  ).lean()

  if (!updated) {
    // Either not found, or thumbnail was already set — both are fine
    const existing = await Video.findById(id).select('thumbnail').lean()
    return NextResponse.json({
      saved: false,
      thumbnail: existing?.thumbnail ?? null,
    })
  }

  return NextResponse.json({ saved: true, thumbnail })
}
