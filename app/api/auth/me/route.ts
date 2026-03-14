import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  // User ID injected by middleware
  const userId = request.headers.get('x-user-id')
  const role   = request.headers.get('x-user-role')

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(userId).select('username role lastLogin').lean()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ username: user.username, role: user.role, lastLogin: user.lastLogin })
}
