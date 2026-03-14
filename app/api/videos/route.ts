import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'
import { VIDEO_EXTS } from '@/lib/crawler'

export async function GET(request: NextRequest) {
  // Auth enforced by middleware — double-check here
  if (!request.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = request.nextUrl
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit    = Math.min(50, parseInt(searchParams.get('limit') || '24'))
  const search   = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const ext      = searchParams.get('ext') || 'video'  // 'video' | 'pdf' | 'all'
  const sort     = searchParams.get('sort') || 'title' // 'title' | 'likes' | 'newest'
  const favIds   = searchParams.get('favIds') || ''    // comma-sep session IDs

  await connectDB()

  // Build query
  const query: Record<string, any> = {}

  if (ext === 'video') query.extension = { $in: VIDEO_EXTS }
  else if (ext === 'pdf') query.extension = 'pdf'
  // ext === 'all' → no filter

  if (category) query.category = category
  if (search) query.$text = { $search: search }
  if (favIds) query.favoritedBy = { $in: favIds.split(',') }

  const sortMap: Record<string, any> = {
    title: { title: 1 },
    likes: { likes: -1 },
    newest: { createdAt: -1 },
  }

  const [items, total] = await Promise.all([
    Video.find(query)
      .sort(sortMap[sort] || { title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v')
      .lean(),
    Video.countDocuments(query),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
