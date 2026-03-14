import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  userId: string
  role: 'admin' | 'viewer'
}

function secret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
