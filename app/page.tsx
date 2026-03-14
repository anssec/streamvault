import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/jwt'

export default async function Home() {
  const token = (await cookies()).get('sv_token')?.value
  if (token) {
    const payload = await verifyToken(token)
    if (payload) redirect('/browse')
  }
  redirect('/login')
}
