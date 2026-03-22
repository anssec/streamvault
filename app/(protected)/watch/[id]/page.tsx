'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import VideoPlayer from '@/components/VideoPlayer'
import VideoThumbnail from '@/components/VideoThumbnail'
import { getClientSessionId } from '@/lib/session'
import { VideoItem } from '@/components/VideoCard'

function fmtDuration(s?: number) {
  if (!s || isNaN(s)) return ''
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

export default function WatchPage() {
  const { id } = useParams() as { id: string }
  const [sessionId] = useState(() => getClientSessionId())
  const [video, setVideo]       = useState<VideoItem | null>(null)
  const [related, setRelated]   = useState<VideoItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [likes, setLikes]       = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [liked, setLiked]       = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [fav, setFav]           = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/videos/${id}`)
      .then(r => r.json())
      .then(v => {
        setVideo(v)
        setLikes(v.likes || 0)
        setDislikes(v.dislikes || 0)
        setLiked(v.likedBy?.includes(sessionId) || false)
        setDisliked(v.dislikedBy?.includes(sessionId) || false)
        setFav(v.favoritedBy?.includes(sessionId) || false)
        // Load related (same category)
        return fetch(`/api/videos?category=${v.category}&limit=8`)
      })
      .then(r => r.json())
      .then(d => setRelated((d.items || []).filter((v: VideoItem) => v._id !== id)))
      .finally(() => setLoading(false))
  }, [id, sessionId])

  async function handleLike(action: 'like'|'unlike'|'dislike'|'undislike') {
    const res = await fetch('/api/user/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: id, action, sessionId }),
    })
    const data = await res.json()
    setLikes(data.likes); setDislikes(data.dislikes)
    setLiked(data.liked); setDisliked(data.disliked)
  }

  async function handleFav() {
    const res = await fetch('/api/user/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: id, sessionId }),
    })
    const data = await res.json()
    setFav(data.favorited)
  }

  if (loading) return (
    <div className="min-h-screen bg-sv-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sv-border border-t-sv-accent rounded-full animate-spin" />
    </div>
  )

  if (!video) return (
    <div className="min-h-screen bg-sv-bg flex flex-col items-center justify-center gap-4">
      <p className="text-white text-lg">Video not found.</p>
      <Link href="/browse" className="text-sv-accent hover:underline text-sm">← Back to Browse</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-sv-bg">
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-20 pb-16">
        <Link href="/browse" className="inline-flex items-center gap-1.5 text-sv-muted hover:text-white text-sm mb-5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Library
        </Link>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Player + info */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              videoId={id}
              title={video.title}
              likes={likes}
              dislikes={dislikes}
              liked={liked}
              disliked={disliked}
              fav={fav}
              onLike={handleLike}
              onFav={handleFav}
            />

            {/* Info */}
            <div className="mt-5 space-y-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="px-2.5 py-1 bg-sv-accent/15 text-sv-accent rounded-lg text-xs font-medium uppercase tracking-wide">
                  {video.extension}
                </span>
                <span className="text-sv-muted">{video.category}</span>
                {video.duration ? <span className="text-sv-accent font-medium">{fmtDuration(video.duration)}</span> : null}
                {video.quality ? <span className="px-1.5 py-0.5 bg-sv-accent/10 text-sv-accent rounded text-[10px] font-bold uppercase">{video.quality}</span> : null}
                {video.size && <span className="text-sv-muted">{video.size}</span>}
                {video.lastModified && <span className="text-sv-muted">{video.lastModified?.slice(0,10)}</span>}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-sv-border">
                {/* Like */}
                <button onClick={() => handleLike(liked ? 'unlike' : 'like')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    liked ? 'bg-sv-accent/15 border-sv-accent/30 text-sv-accent' : 'border-sv-border text-sv-muted hover:text-white hover:border-white/20'
                  }`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  Like {likes > 0 && <span className="font-bold">{likes}</span>}
                </button>

                {/* Dislike */}
                <button onClick={() => handleLike(disliked ? 'undislike' : 'dislike')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    disliked ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-sv-border text-sv-muted hover:text-white hover:border-white/20'
                  }`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                  </svg>
                  Dislike {dislikes > 0 && <span className="font-bold">{dislikes}</span>}
                </button>

                {/* Favourite */}
                <button onClick={handleFav}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    fav ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'border-sv-border text-sv-muted hover:text-yellow-400 hover:border-yellow-500/30'
                  }`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {fav ? 'Saved' : 'Save to Favourites'}
                </button>

                {/* Keyboard shortcuts hint */}
                <div className="ml-auto hidden lg:flex items-center gap-4 text-xs text-sv-muted">
                  {[['Space','Play'],['F','Fullscreen'],['←→','Seek 10s'],['M','Mute']].map(([k,l]) => (
                    <span key={k} className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-sv-card rounded text-gray-400 font-mono">{k}</kbd>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Related sidebar */}
          {related.length > 0 && (
            <div className="xl:w-72 flex-shrink-0">
              <h3 className="text-white font-semibold mb-4 text-base">More from this course</h3>
              <div className="space-y-3">
                {related.map(v => (
                  <Link key={v._id} href={`/watch/${v._id}`}>
                    <div className="flex gap-3 p-2 rounded-xl hover:bg-sv-card border border-transparent hover:border-sv-border transition-colors group">
                      <div className="w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 relative">
                        <VideoThumbnail
                          videoId={v._id}
                          title={v.title}
                          cachedThumbnail={v.thumbnail}
                          duration={v.duration}
                          quality={v.quality}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-sv-accent transition-colors leading-snug">
                          {v.title}
                        </p>
                        <p className="text-sv-muted text-[10px] mt-1 uppercase font-semibold">
                          {v.extension} {v.size && `• ${v.size}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
