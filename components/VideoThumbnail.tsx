'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VideoThumbnailProps {
  videoId: string
  title: string
  /** Thumbnail already stored in DB — skip generation entirely if provided */
  cachedThumbnail?: string
  /** Seek time in seconds for frame capture (default: 5) */
  seekTo?: number
  className?: string
}

type ThumbState = 'ready' | 'generating' | 'error'

// Process-level in-memory cache so we never re-fetch within a single page session
const memCache = new Map<string, string>()

export default function VideoThumbnail({
  videoId,
  title,
  cachedThumbnail,
  seekTo = 5,
  className = '',
}: VideoThumbnailProps) {
  // Initialise from prop (DB value passed at render time) or mem-cache
  const initial = cachedThumbnail || memCache.get(videoId)

  const [dataUrl, setDataUrl] = useState<string>(initial ?? '')
  const [state, setState] = useState<ThumbState>(initial ? 'ready' : 'generating')

  const containerRef = useRef<HTMLDivElement>(null)
  const attemptedRef = useRef(false)

  // ── Frame capture ────────────────────────────────────────────────────────
  const captureAndSave = useCallback(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    // Already have it — nothing to do
    if (memCache.has(videoId)) {
      setDataUrl(memCache.get(videoId)!)
      setState('ready')
      return
    }

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = `/api/stream/${videoId}`

    let settled = false

    const cleanup = () => {
      video.src = ''
      video.load()
    }

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        setState('error')
      }
    }, 20_000)

    const onSeeked = async () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)

      try {
        const canvas = document.createElement('canvas')
        canvas.width = 480
        canvas.height = 270
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const url = canvas.toDataURL('image/jpeg', 0.75)

        if (url.length < 500) throw new Error('blank frame')

        // Update UI immediately
        memCache.set(videoId, url)
        setDataUrl(url)
        setState('ready')

        // Persist to DB in the background — fire and forget
        fetch(`/api/videos/${videoId}/thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thumbnail: url }),
        }).catch(() => {
          console.warn(`[thumbnail] Failed to save thumbnail for ${videoId}`)
        })
      } catch {
        setState('error')
      } finally {
        cleanup()
      }
    }

    const onError = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        cleanup()
        setState('error')
      }
    }

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })

    video.addEventListener('loadedmetadata', () => {
      const t = Math.min(seekTo, Math.max(0, (video.duration || seekTo + 1) - 0.5))
      video.currentTime = t
    }, { once: true })
  }, [videoId, seekTo])

  // ── IntersectionObserver — only generate when card enters viewport ────────
  useEffect(() => {
    if (state === 'ready') return

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          captureAndSave()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [captureAndSave, state])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {state === 'ready' && dataUrl ? (
        <img
          src={dataUrl}
          alt={`Thumbnail – ${title}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0f1825] to-[#0a1020]">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 40%, #3b82f6 0%, transparent 50%), ' +
                'radial-gradient(circle at 70% 70%, #1d4ed8 0%, transparent 40%)',
            }}
          />

          <div className="flex flex-col items-center gap-2 z-10">
            {state === 'generating' ? (
              <>
                <svg
                  className="animate-spin text-sv-accent"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="text-[10px] text-sv-muted uppercase tracking-wider">
                  Generating…
                </span>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-sv-accent/20 border border-sv-accent/30 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#3b82f6">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <span className="text-[10px] text-sv-muted uppercase tracking-wider">
                  No preview
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
