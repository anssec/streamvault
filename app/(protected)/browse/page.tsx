'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import VideoCard, { VideoItem } from '@/components/VideoCard'
import { getClientSessionId } from '@/lib/session'

const SORTS = [
  { value: 'title',  label: 'A → Z' },
  { value: 'newest', label: 'Newest' },
  { value: 'likes',  label: 'Most Liked' },
]
const EXTS = [
  { value: 'video', label: '🎬 Videos' },
  { value: 'pdf',   label: '📄 PDFs' },
  { value: 'all',   label: 'All Files' },
]

function BrowseContent() {
  const router = useRouter()
  const sp = useSearchParams()

  const [sessionId] = useState(() => getClientSessionId())
  const [videos, setVideos]         = useState<VideoItem[]>([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [dbEmpty, setDbEmpty]       = useState(false)

  // Filters — read from URL params
  const page      = parseInt(sp.get('page') || '1')
  const search    = sp.get('q') || ''
  const category  = sp.get('category') || ''
  const ext       = sp.get('ext') || 'video'
  const sort      = sp.get('sort') || 'title'
  const favView   = sp.get('view') === 'favorites'

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // Reset to page 1 when changing filters, but NOT when changing page itself
    if (key !== 'page') params.delete('page')
    router.push(`/browse?${params.toString()}`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '24',
        ext, sort,
        ...(search && { q: search }),
        ...(category && { category }),
        ...(favView && { favIds: sessionId }),
      })
      const res = await fetch(`/api/videos?${params}`)
      const data = await res.json()
      setVideos(data.items || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
      if (data.total === 0 && !search && !category && !favView) setDbEmpty(true)
    } finally {
      setLoading(false)
    }
  }, [page, ext, sort, search, category, favView, sessionId])

  // Load categories once
  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.categories) setCategories(d.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  function handleFavChange(id: string, isFav: boolean) {
    if (favView && !isFav) {
      setVideos(v => v.filter(x => x._id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-sv-bg">
      <Navbar />

      {/* Header */}
      <div className="pt-20 pb-6 px-4 md:px-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {favView ? '⭐ Favourites' : search ? `Results for "${search}"` : 'Browse Library'}
            </h1>
            <p className="text-sv-muted text-sm mt-1">
              {loading ? '…' : `${total.toLocaleString()} file${total !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ext filter */}
            <div className="flex bg-sv-card border border-sv-border rounded-xl overflow-hidden">
              {EXTS.map(e => (
                <button key={e.value} onClick={() => setParam('ext', e.value)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    ext === e.value ? 'bg-sv-accent text-white' : 'text-sv-muted hover:text-white'
                  }`}>
                  {e.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setParam('sort', e.target.value)}
              className="bg-sv-card border border-sv-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sv-accent cursor-pointer"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Category */}
            {categories.length > 0 && (
              <select
                value={category}
                onChange={e => setParam('category', e.target.value)}
                className="bg-sv-card border border-sv-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sv-accent cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Favourites toggle */}
            <button
              onClick={() => favView ? router.push('/browse') : setParam('view', 'favorites')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                favView
                  ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                  : 'border-sv-border text-sv-muted hover:text-white hover:border-white/20'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={favView ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Favourites
            </button>
          </div>
        </div>
      </div>

      {/* Empty DB banner */}
      {dbEmpty && !loading && (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mb-8">
          <div className="bg-sv-accent/10 border border-sv-accent/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sv-accent/20 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Database is empty</p>
              <p className="text-sv-muted text-sm mt-0.5">
                Go to{' '}
                <a href="/admin" className="text-sv-accent hover:underline">Admin → Crawl</a>
                {' '}to scan your video server and populate the library.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <div className="aspect-video skeleton" />
                <div className="bg-sv-card p-3 space-y-2">
                  <div className="h-3 skeleton rounded w-4/5" />
                  <div className="h-3 skeleton rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sv-muted text-lg">No videos found.</p>
            {search && (
              <button onClick={() => router.push('/browse')} className="mt-3 text-sv-accent text-sm hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {videos.map(v => (
              <VideoCard
                key={v._id}
                video={v}
                sessionId={sessionId}
                onFavChange={handleFavChange}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
              className="px-4 py-2 bg-sv-card border border-sv-border rounded-xl text-sm text-white disabled:opacity-40 hover:bg-sv-border transition-colors"
            >
              ← Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                const p = page <= 4 ? i + 1
                  : page >= pages - 3 ? pages - 6 + i
                  : page - 3 + i
                if (p < 1 || p > pages) return null
                return (
                  <button key={p} onClick={() => setParam('page', String(p))}
                    className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                      p === page ? 'bg-sv-accent text-white' : 'text-sv-muted hover:text-white hover:bg-sv-card'
                    }`}>
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              disabled={page >= pages}
              onClick={() => setParam('page', String(page + 1))}
              className="px-4 py-2 bg-sv-card border border-sv-border rounded-xl text-sm text-white disabled:opacity-40 hover:bg-sv-border transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  )
}
