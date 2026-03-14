import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/jwt'
import Link from 'next/link'
import CrawlManager from '@/components/CrawlManager'
import UserManager from '@/components/UserManager'

export default async function AdminPage() {
  const token = (await cookies()).get('sv_token')?.value
  if (!token) redirect('/login')
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') redirect('/browse')

  return (
    <div className="min-h-screen bg-sv-bg">
      {/* Header */}
      <div className="border-b border-sv-border bg-sv-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/browse" className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded-md bg-sv-accent flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <span className="font-display font-semibold text-white text-sm group-hover:text-sv-accent transition-colors">{process.env.NEXT_PUBLIC_APP_NAME || 'StreamVault'}</span>
            </Link>
            <span className="text-sv-border text-lg font-light">/</span>
            <span className="text-sv-muted text-sm">Admin</span>
          </div>
          <Link
            href="/browse"
            className="flex items-center gap-1.5 text-sm text-sv-muted hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-sv-card border border-transparent hover:border-sv-border"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Browse
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sv-muted text-sm mt-1">Manage users, crawl video sources, and configure {process.env.NEXT_PUBLIC_APP_NAME || 'StreamVault'}</p>
        </div>

        {/* Security status */}
        <div className="bg-sv-card border border-sv-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 className="text-white font-semibold text-base">Security Active</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'JWT auth — httpOnly cookie, 12h expiry',
              'bcrypt password hashing (cost 12)',
              'Rate limiting — 10 attempts / 15 min / IP',
              'Timing-attack-safe password comparison',
              '35+ bot/crawler user-agents blocked',
              'robots.txt: Disallow all crawlers',
              'Admin routes require role=admin in JWT',
              'Security headers on all responses',
              'No User-Agent → blocked',
              'Passwords never exposed in API responses',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-sv-muted">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="flex-shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <UserManager />

        {/* Crawl Manager */}
        <div className="space-y-3">
          <h2 className="text-white font-display font-semibold text-lg">Library Crawler</h2>
          <CrawlManager />
        </div>

        {/* .env.local reference */}
        <div className="bg-sv-card border border-sv-border rounded-2xl p-6">
          <h2 className="text-white font-display font-semibold text-base mb-3">.env.local</h2>
          <pre className="text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto bg-sv-bg border border-sv-border rounded-xl p-4">{`MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/streamvault
JWT_SECRET=at-least-32-random-characters-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password-min-8-chars
CRAWL_URLS=https://www.rfmri.org/Course/V3.0EN/`}</pre>
        </div>
      </div>
    </div>
  )
}
