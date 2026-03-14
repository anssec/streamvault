'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface UserInfo {
  username: string
  role: 'admin' | 'viewer'
}

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()

  const [scrolled, setScrolled]     = useState(false)
  const [search, setSearch]         = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [user, setUser]             = useState<UserInfo | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Scroll handler
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUser({ username: d.username, role: d.role }) })
      .catch(() => {})
  }, [])

  // Close menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      // Clear the anonymous session ID so likes/favs don't persist after logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sv_session')
      }
      router.push('/login')
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/browse?q=${encodeURIComponent(search.trim())}`)
      setShowSearch(false)
      setSearch('')
    }
  }

  const navLinks = [
    { label: 'Browse',     href: '/browse' },
    { label: 'Favourites', href: '/browse?view=favorites' },
    ...(user?.role === 'admin' ? [{ label: 'Admin', href: '/admin' }] : []),
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-sv-bg/95 backdrop-blur-md border-b border-sv-border shadow-lg shadow-black/30'
        : 'bg-gradient-to-b from-sv-bg/80 to-transparent'
    }`}>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 h-14 flex items-center gap-4">

        {/* Logo */}
        <Link href="/browse" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="w-7 h-7 rounded-lg bg-sv-accent flex items-center justify-center shadow shadow-blue-500/30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <span className="font-display font-semibold text-white text-base tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME || 'StreamVault'}
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          {navLinks.map(({ label, href }) => {
            const isActive = pathname === href.split('?')[0] &&
              (href.includes('?') ? false : true)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-sv-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">

          {/* Search */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search videos…"
                className="w-44 md:w-64 bg-sv-card border border-sv-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-sv-muted focus:outline-none focus:border-sv-accent transition-all"
              />
              <button
                type="button"
                onClick={() => { setShowSearch(false); setSearch('') }}
                className="text-sv-muted hover:text-white transition-colors p-1"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-sv-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          )}

          {/* User menu */}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-lg bg-sv-accent/20 border border-sv-accent/30 flex items-center justify-center text-sv-accent font-bold text-xs">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium hidden md:inline max-w-[100px] truncate">
                  {user.username}
                </span>
                {user.role === 'admin' && (
                  <span className="hidden md:inline text-[10px] bg-sv-accent/20 text-sv-accent px-1.5 py-0.5 rounded font-semibold">
                    ADMIN
                  </span>
                )}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-sv-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-sv-card border border-sv-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-sv-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sv-accent/20 border border-sv-accent/30 flex items-center justify-center text-sv-accent font-bold text-sm">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{user.username}</p>
                        <p className="text-sv-muted text-xs capitalize">{user.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    {navLinks.map(({ label, href }) => (
                      <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        {label === 'Browse' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        )}
                        {label === 'Favourites' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        )}
                        {label === 'Admin' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0m14.14 14.14a10 10 0 0 1-14.14 0"/>
                          </svg>
                        )}
                        {label}
                      </Link>
                    ))}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-sv-border py-1">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {loggingOut ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                        </svg>
                      )}
                      {loggingOut ? 'Signing out…' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
