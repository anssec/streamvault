import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/jwt'

// Server-side auth guard — runs on every protected page render
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('sv_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload) {
    // Token invalid/expired — redirect to login
    redirect('/login')
  }

  return <>{children}</>
}
