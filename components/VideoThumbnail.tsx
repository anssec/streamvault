'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VideoThumbnailProps {
  videoId: string
  title: string
  /** Thumbnail already stored in DB — skip generation entirely if provided */
  cachedThumbnail?: string
  /** Seek time in seconds for frame capture (default: 5) */
  duration?: number
  quality?: string
  seekTo?: number
  className?: string
}

function getQuality(w: number, h: number) {
  const short = Math.min(w, h)
  if (short >= 2160) return '4K'
  if (short >= 1440) return '2K'
  if (short >= 1080) return '1080p'
  if (short >= 720) return '720p'
  if (short >= 480) return '480p'
  return 'SD'
}

function fmt(s: number) {
  if (!s || isNaN(s)) return ''
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

type ThumbState = 'ready' | 'generating' | 'error'

// Process-level in-memory cache so we never re-fetch within a single page session
const memCache = new Map<string, string>()

export default function VideoThumbnail({
  videoId,
  title,
  cachedThumbnail,
  duration,
  quality,
  seekTo = 5,
  className = '',
}: VideoThumbnailProps) {
  // Initialise from prop (DB value passed at render time) or mem-cache
  const initial = cachedThumbnail || memCache.get(videoId)

  const [dataUrl, setDataUrl] = useState<string>(initial ?? '')
  const [state, setState] = useState<ThumbState>(initial ? 'ready' : 'generating')
  const [videoDuration, setVideoDuration] = useState<number>(duration ?? 0)
  const [videoQuality, setVideoQuality] = useState<string>(quality ?? '')

  const containerRef = useRef<HTMLDivElement>(null)
  const attemptedRef = useRef(false)

  // ── Frame capture ────────────────────────────────────────────────────────
  const captureAndSave = useCallback(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    // Already have thumbnail in memory?
    if (memCache.has(videoId)) {
      setDataUrl(memCache.get(videoId)!)
      // If we also already have duration and quality, we are truly done
      if (videoDuration > 0 && videoQuality) {
        setState('ready')
        return
      }
      // Otherwise, we continue to load the video just to get the duration
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
        let url = memCache.get(videoId)
        
        if (!url) {
          const canvas = document.createElement('canvas')
          canvas.width = 480
          canvas.height = 270
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          url = canvas.toDataURL('image/jpeg', 0.75)
          if (url.length < 500) throw new Error('blank frame')
          memCache.set(videoId, url)
          setDataUrl(url)
        }

        const q = getQuality(video.videoWidth, video.videoHeight)
        setVideoDuration(video.duration)
        setVideoQuality(q)
        setState('ready')

        // Persist to DB
        fetch(`/api/videos/${videoId}/thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thumbnail: url, duration: video.duration, quality: q }),
        }).catch(() => {})
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
    // Generate if any metadata is missing
    if (state === 'ready' && videoDuration > 0 && videoQuality) return

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
  }, [captureAndSave, state, videoDuration, videoQuality])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {state === 'ready' && dataUrl ? (
        <>
          <img
            src={dataUrl}
            alt={`Thumbnail – ${title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {videoDuration > 0 && (
            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded font-mono font-medium z-10">
              {fmt(videoDuration)}
            </span>
          )}
          {videoQuality && (
            <span className="absolute top-1 right-1 bg-sv-accent/80 text-white text-[9px] px-1 rounded font-bold z-10 uppercase tracking-tighter">
              {videoQuality}
            </span>
          )}
        </>
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
