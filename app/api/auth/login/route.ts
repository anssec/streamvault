import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import User from '@/lib/models/User'
import { signToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

// In-memory rate limit store (per-process; acceptable for single-instance deployment)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const WINDOW = 15 * 60 * 1000  // 15 minutes
  const MAX    = 10               // 10 attempts per window

  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW })
    return false
  }
  if (entry.count >= MAX) return true
  entry.count++
  return false
}

// Pre-computed dummy hash for timing-safe rejection (valid bcrypt hash)
const DUMMY_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpQVCNX.Qk1hWi'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait 15 minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    )
  }

  let username = '', password = ''
  try {
    const body = await request.json()
    username = String(body.username ?? '').trim().toLowerCase()
    password = String(body.password ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  if (username.length > 64 || password.length > 128) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await connectDB()

  // ── Bootstrap: auto-create admin on first run ─────────────────────────────
  const count = await User.countDocuments()
  if (count === 0) {
    const adminUser = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? ''
    const adminPass = process.env.ADMIN_PASSWORD?.trim() ?? ''
    if (!adminUser || !adminPass || adminPass.length < 8) {
      return NextResponse.json(
        { error: 'No users exist. Set ADMIN_USERNAME and ADMIN_PASSWORD (min 8 chars) in .env.local.' },
        { status: 503 }
      )
    }
    const hash = await bcrypt.hash(adminPass, 12)
    await User.create({ username: adminUser, passwordHash: hash, role: 'admin' })
  }

  const user = await User.findOne({ username }).select('+passwordHash')

  // Always run bcrypt to prevent timing attacks
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordMatch) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  user.lastLogin = new Date()
  await user.save()

  const token = await signToken({ userId: user._id.toString(), role: user.role })

  const res = NextResponse.json({ success: true, role: user.role })
  res.cookies.set('sv_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   12 * 60 * 60,   // 12 hours
    path:     '/',
  })
  return res
}
