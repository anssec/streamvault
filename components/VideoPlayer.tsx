'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  videoId: string
  title: string
  likes: number
  dislikes: number
  liked: boolean
  disliked: boolean
  fav: boolean
  onLike: (action: 'like'|'unlike'|'dislike'|'undislike') => void
  onFav: () => void
}

function fmt(s: number) {
  if (isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

export default function VideoPlayer({ videoId, title, likes, dislikes, liked, disliked, fav, onLike, onFav }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const hideRef      = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [playing, setPlaying]         = useState(false)
  const [current, setCurrent]         = useState(0)
  const [duration, setDuration]       = useState(0)
  const [buffered, setBuffered]       = useState(0)
  const [volume, setVolume]           = useState(1)
  const [muted, setMuted]             = useState(false)
  const [fs, setFs]                   = useState(false)
  const [showCtrl, setShowCtrl]       = useState(true)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [showHover, setShowHover]     = useState(false)
  const [speed, setSpeed]             = useState(1)
  const [showSpeeds, setShowSpeeds]   = useState(false)
  const [showVolume, setShowVolume]   = useState(false)
  const [hoverTime, setHoverTime]     = useState(0)
  const [hoverX, setHoverX]           = useState(0)

  // Mobile Gestures
  const [tapSide, setTapSide]         = useState<'left'|'right'|null>(null)
  const [skipCount, setSkipCount]     = useState(0)
  const [isLongPress, setIsLongPress] = useState(false)
  const lastTapRef = useRef<{ time: number; side: 'left'|'right' } | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const skipTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined)

  const previewVideoRef = useRef<HTMLVideoElement>(null)

  const src = `/api/stream/${videoId}`

  const resetHide = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideRef.current)
    hideRef.current = setTimeout(() => { if (playing) setShowCtrl(false) }, 3000)
  }, [playing])

  useEffect(() => { resetHide(); return () => clearTimeout(hideRef.current) }, [resetHide])

  useEffect(() => {
    const fn = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current
      if (!v) return
      switch (e.code) {
        case 'Space': case 'KeyK': e.preventDefault(); toggle(); break
        case 'KeyF': toggleFs(); break
        case 'KeyM': toggleMute(); break
        case 'ArrowRight': v.currentTime = Math.min(v.duration, v.currentTime + 10); break
        case 'ArrowLeft':  v.currentTime = Math.max(0, v.currentTime - 10); break
        case 'ArrowUp':    e.preventDefault(); setVol(Math.min(1, volume + 0.1)); break
        case 'ArrowDown':  e.preventDefault(); setVol(Math.max(0, volume - 0.1)); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line

  function toggle() {
    const v = videoRef.current; if (!v) return
    v.paused ? v.play().catch(() => {}) : v.pause()
    resetHide()
  }
  function toggleMute() {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }
  function setVol(n: number) {
    const v = videoRef.current; if (!v) return
    v.volume = n; setVolume(n); setMuted(n === 0)
  }
  async function toggleFs() {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen()
    else await document.exitFullscreen()
  }
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !videoRef.current || !duration) return
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }
  function setRate(r: number) {
    if (videoRef.current) videoRef.current.playbackRate = r
    setSpeed(r); setShowSpeeds(false)
  }

  function handleHover(e: React.MouseEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const p = x / rect.width
    setHoverTime(p * duration)
    setHoverX(x)
    setShowHover(true)
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = p * duration
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const v = videoRef.current; if (!v) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.touches[0].clientX - rect.left
    const side: 'left' | 'right' = x < rect.width / 2 ? 'left' : 'right'

    // Long press logic
    clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => {
      if (side === 'right') {
        v.playbackRate = 2
        setIsLongPress(true)
      }
    }, 500)

    // Double tap logic
    const now = Date.now()
    if (lastTapRef.current && (now - lastTapRef.current.time) < 300 && lastTapRef.current.side === side) {
      // Double tap detected
      clearTimeout(skipTimerRef.current)
      const newSkip = skipCount + 10
      setSkipCount(newSkip)
      setTapSide(side)

      if (side === 'right') v.currentTime = Math.min(v.duration, v.currentTime + 10)
      else v.currentTime = Math.max(0, v.currentTime - 10)

      skipTimerRef.current = setTimeout(() => {
        setSkipCount(0)
        setTapSide(null)
      }, 1000)

      // Prevent single tap toggle
      lastTapRef.current = null
    } else {
      lastTapRef.current = { time: now, side }
    }
  }

  const handleTouchEnd = () => {
    const v = videoRef.current; if (!v) return
    clearTimeout(pressTimerRef.current)
    if (isLongPress) {
      v.playbackRate = speed
      setIsLongPress(false)
    }
  }

  const pct  = duration ? (current / duration) * 100 : 0
  const bPct = duration ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video rounded-2xl overflow-hidden select-none"
      onMouseMove={resetHide}
      onClick={toggle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current; if (!v) return
          setCurrent(v.currentTime)
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current; if (!v) return
          setDuration(v.duration)
          setLoading(false)
          
          // Push metadata to DB if not already present
          const q = v.videoWidth ? (v.videoHeight >= 2160 ? '4K' : v.videoHeight >= 1440 ? '2K' : v.videoHeight >= 1080 ? '1080p' : v.videoHeight >= 720 ? '720p' : v.videoHeight >= 480 ? '480p' : 'SD') : ''
          fetch(`/api/videos/${videoId}/thumbnail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: v.duration, quality: q })
          }).catch(() => {})
        }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onError={() => { setError('Video unavailable. Check your VIDEO_BASE_URL and filename.'); setLoading(false) }}
      />

      {/* Spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-12 h-12 border-4 border-white/20 border-t-sv-accent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-8 text-center" onClick={e => e.stopPropagation()}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-white text-sm font-medium">{error}</p>
          <button onClick={() => { setError(''); videoRef.current?.load() }}
            className="px-5 py-2 bg-sv-accent text-white rounded-lg text-sm hover:bg-sv-accent-hover transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Center play icon */}
      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      )}

      {/* Skip Visual Feedback */}
      {tapSide && (
        <div className={`absolute inset-y-0 ${tapSide === 'left' ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'} w-1/3 bg-white/10 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300`}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className={tapSide === 'left' ? 'rotate-180' : ''}>
              <path d="M13 19l-7-7 7-7m8 14l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="text-white font-bold">{tapSide === 'left' ? '-' : '+'}{skipCount}s</span>
        </div>
      )}

      {/* 2x Speed Status */}
      {isLongPress && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 z-30 animate-in fade-in slide-in-from-top-2">
          <div className="w-2 h-2 bg-sv-accent rounded-full animate-pulse" />
          <span className="text-white text-xs font-bold tracking-widest">2X SPEED</span>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showCtrl ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => { if (e.target === e.currentTarget) toggle(); e.stopPropagation() }}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)' }}
      >
        {/* Title bar */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-white font-display font-semibold text-base truncate">{title}</p>
        </div>

        {/* Progress */}
        <div className="px-5 py-2">
          <div
            ref={progressRef}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer group/bar hover:h-2.5 transition-all"
            onClick={seek}
            onMouseMove={handleHover}
            onMouseLeave={() => setShowHover(false)}
          >
            {/* Seek Preview Tooltip (Always rendered for preloading) */}
            <div
              className={`absolute bottom-12 rounded-xl border-2 border-white/20 shadow-2xl overflow-hidden bg-black pointer-events-none flex flex-col items-center gap-1.5 p-1 transition-all duration-200 ${showHover ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
              style={{ left: hoverX, transform: 'translateX(-50%)' }}
            >
              <div className="w-44 aspect-video bg-sv-card relative overflow-hidden rounded-lg">
                <video
                  ref={previewVideoRef}
                  src={src}
                  muted
                  preload="auto"
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded border border-white/10">
                {fmt(hoverTime)}
              </span>
            </div>

            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-sv-accent rounded-full prog-bar" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity shadow"
              style={{ left: `calc(${pct}% - 6px)` }} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between px-4 pb-4 gap-3">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={toggle} className="w-8 h-8 flex items-center justify-center text-white hover:text-sv-accent transition-colors">
              {playing
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            {/* Skip */}
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10 }}
              className="text-white/70 hover:text-white text-[11px] font-semibold transition-colors hidden sm:block">−10</button>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10 }}
              className="text-white/70 hover:text-white text-[11px] font-semibold transition-colors hidden sm:block">+10</button>

            {/* Volume */}
            <div className="flex items-center gap-1.5" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                {muted || volume === 0
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                }
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${showVolume ? 'w-18 opacity-100' : 'w-0 opacity-0'}`}>
                <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                  onChange={e => setVol(parseFloat(e.target.value))} className="w-16 h-1" />
              </div>
            </div>

            {/* Time */}
            <span className="text-white/70 text-xs font-mono hidden sm:inline">
              {fmt(current)} / {fmt(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Like */}
            <button onClick={() => onLike(liked ? 'unlike' : 'like')}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${liked ? 'text-sv-accent bg-sv-accent/15' : 'text-white/70 hover:text-white'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              <span>{likes}</span>
            </button>

            {/* Dislike */}
            <button onClick={() => onLike(disliked ? 'undislike' : 'dislike')}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${disliked ? 'text-red-400 bg-red-500/15' : 'text-white/70 hover:text-white'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
              </svg>
              <span>{dislikes}</span>
            </button>

            {/* Favourite */}
            <button onClick={onFav}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${fav ? 'text-yellow-400 bg-yellow-500/15' : 'text-white/70 hover:text-yellow-400'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>

            {/* Speed */}
            <div className="relative">
              <button onClick={() => setShowSpeeds(s => !s)}
                className="text-white/70 hover:text-white text-[11px] font-bold px-2 py-1 border border-white/20 rounded-lg transition-colors">
                {speed}×
              </button>
              {showSpeeds && (
                <div className="absolute bottom-9 right-0 bg-sv-card border border-sv-border rounded-xl overflow-hidden shadow-2xl min-w-[80px]">
                  {[0.5,0.75,1,1.25,1.5,2].map(r => (
                    <button key={r} onClick={() => setRate(r)}
                      className={`block w-full text-center px-4 py-2 text-xs hover:bg-white/5 transition-colors ${speed === r ? 'text-sv-accent font-semibold' : 'text-white/80'}`}>
                      {r}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFs} className="text-white/80 hover:text-white transition-colors">
              {fs
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
