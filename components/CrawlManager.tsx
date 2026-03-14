'use client'

import { useState, useEffect } from 'react'

interface CrawlStats {
  crawled: number
  inserted: number
  skipped: number
  errors: string[]
}

interface LibStats {
  total: number
  videos: number
  categories: string[]
}

export default function CrawlManager() {
  const [extraUrls, setExtraUrls] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ stats: CrawlStats; message: string } | null>(null)
  const [error, setError]         = useState('')
  const [libStats, setLibStats]   = useState<LibStats | null>(null)

  // Load current library stats on mount
  useEffect(() => {
    fetch('/api/crawl')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLibStats(d) })
      .catch(() => {})
  }, [])

  async function runCrawl() {
    setLoading(true); setError(''); setResult(null)
    try {
      const urls = extraUrls.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Crawl failed'); return }
      setResult(data)
      // Refresh stats
      const statsRes = await fetch('/api/crawl')
      if (statsRes.ok) setLibStats(await statsRes.json())
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Library stats */}
      {libStats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total files',   value: libStats.total,      color: 'text-white' },
            { label: 'Videos',        value: libStats.videos,     color: 'text-sv-accent' },
            { label: 'Categories',    value: libStats.categories.length, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-sv-bg border border-sv-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
              <div className="text-sv-muted text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-sv-card border border-sv-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-display font-semibold text-lg mb-1">Crawl Video Sources</h2>
          <p className="text-sv-muted text-sm">
            Scans the index URLs from <code className="text-sv-accent bg-sv-accent/10 px-1 rounded">CRAWL_URLS</code> in
            your .env.local, plus any extras below. <strong className="text-white font-medium">Automatically follows subdirectories</strong> (up to 5 levels deep).
            All unique video and PDF links are saved to MongoDB — duplicates skipped.
          </p>
        </div>

        {/* Extra URLs */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Extra Index URLs <span className="text-sv-muted font-normal">(optional — one per line)</span>
          </label>
          <textarea
            value={extraUrls}
            onChange={e => setExtraUrls(e.target.value)}
            rows={4}
            placeholder={`https://example.com/Course/V2.0EN/\nhttps://example.com/Course/V1.0EN/`}
            className="w-full bg-sv-bg border border-sv-border rounded-xl px-4 py-3 text-sm text-white placeholder-sv-muted focus:outline-none focus:border-sv-accent transition-colors font-mono resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p className="text-green-400 font-semibold text-sm">{result.message}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Found',    value: result.stats.crawled,  color: 'text-white' },
                { label: 'New',      value: result.stats.inserted, color: 'text-green-400' },
                { label: 'Skipped',  value: result.stats.skipped,  color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-sv-bg rounded-lg p-2.5 text-center">
                  <div className={`text-xl font-bold font-display ${color}`}>{value}</div>
                  <div className="text-sv-muted text-xs">{label}</div>
                </div>
              ))}
            </div>
            {result.stats.errors.length > 0 && (
              <details className="text-sm">
                <summary className="text-red-400 cursor-pointer hover:text-red-300 transition-colors">
                  {result.stats.errors.length} error(s) — click to expand
                </summary>
                <ul className="mt-2 space-y-1 pl-2 border-l border-red-500/20">
                  {result.stats.errors.map((e, i) => (
                    <li key={i} className="text-red-400/80 text-xs font-mono">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <button
          onClick={runCrawl}
          disabled={loading}
          className="w-full py-3 bg-sv-accent hover:bg-sv-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Crawling — this may take a moment…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16H3v5"/>
              </svg>
              Start Crawl
            </>
          )}
        </button>
      </div>
    </div>
  )
}
