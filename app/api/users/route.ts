import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

// GET /api/users — list all users (admin only, enforced by middleware)
export async function GET(request: NextRequest) {
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const users = await User.find().select('username role createdAt lastLogin').lean()
  return NextResponse.json({ users })
}

// POST /api/users — create a new user (admin only)
export async function POST(request: NextRequest) {
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let username = '', password = '', role = 'viewer'
  try {
    const body = await request.json()
    username = String(body.username ?? '').trim().toLowerCase()
    password = String(body.password ?? '')
    role     = body.role === 'admin' ? 'admin' : 'viewer'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }
  if (username.length < 3 || username.length > 32) {
    return NextResponse.json({ error: 'Username must be 3–32 characters' }, { status: 400 })
  }
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return NextResponse.json({ error: 'Username may only contain letters, numbers, _ and -' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  await connectDB()

  const existing = await User.findOne({ username })
  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ username, passwordHash, role })

  return NextResponse.json({
    success: true,
    user: { _id: user._id, username: user.username, role: user.role },
  }, { status: 201 })
}

// DELETE /api/users?username=xxx — delete a user (admin only)
export async function DELETE(request: NextRequest) {
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const username = request.nextUrl.searchParams.get('username')?.trim().toLowerCase()
  if (!username) {
    return NextResponse.json({ error: 'username query param required' }, { status: 400 })
  }

  // Prevent deleting yourself
  const requestingUserId = request.headers.get('x-user-id')
  await connectDB()

  const user = await User.findOne({ username })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user._id.toString() === requestingUserId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await User.deleteOne({ _id: user._id })
  return NextResponse.json({ success: true })
}
