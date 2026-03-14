import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'

// Auth enforced by middleware — double-check here
export async function GET(request: NextRequest) {
  if (!request.headers.get('x-user-id')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const categories = await Video.distinct('category')
  return NextResponse.json({ categories: categories.sort() })
}
