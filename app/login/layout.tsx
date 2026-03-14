import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/jwt'

// If already logged in, go straight to browse
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('sv_token')?.value
  if (token) {
    const payload = await verifyToken(token)
    if (payload) redirect('/browse')
  }
  return <>{children}</>
}
