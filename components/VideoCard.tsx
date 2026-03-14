'use client'

import { useState } from 'react'
import Link from 'next/link'
import VideoThumbnail from './VideoThumbnail'

export interface VideoItem {
  _id: string
  title: string
  filename: string
  extension: string
  size?: string
  sizeBytes?: number
  category: string
  directory?: string
  thumbnail?: string
  likes: number
  dislikes: number
  favoritedBy: string[]
  likedBy: string[]
  dislikedBy: string[]
  lastModified?: string
}

interface VideoCardProps {
  video: VideoItem
  sessionId: string
  onFavChange?: (id: string, fav: boolean) => void
}

export default function VideoCard({ video, sessionId, onFavChange }: VideoCardProps) {
  const [likes, setLikes] = useState(video.likes)
  const [dislikes, setDislikes] = useState(video.dislikes)
  const [liked, setLiked] = useState(video.likedBy?.includes(sessionId))
  const [disliked, setDisliked] = useState(video.dislikedBy?.includes(sessionId))
  const [fav, setFav] = useState(video.favoritedBy?.includes(sessionId))
  const [busy, setBusy] = useState(false)

  const isVideo = ['mp4','webm','mkv','avi','mov','m4v'].includes(video.extension)
  const isPdf   = video.extension === 'pdf'

  async function handleLike(action: 'like' | 'unlike' | 'dislike' | 'undislike') {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/user/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video._id, action, sessionId }),
      })
      const data = await res.json()
      setLikes(data.likes)
      setDislikes(data.dislikes)
      setLiked(data.liked)
      setDisliked(data.disliked)
    } finally {
      setBusy(false)
    }
  }

  async function handleFav(e: React.MouseEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video._id, sessionId }),
      })
      const data = await res.json()
      setFav(data.favorited)
      onFavChange?.(video._id, data.favorited)
    } finally {
      setBusy(false)
    }
  }

  const href = isVideo ? `/watch/${video._id}` : video.filename

  return (
    <div className="vid-card relative bg-sv-card border border-sv-border rounded-xl overflow-hidden card-glow group flex flex-col">

      {/* Thumbnail / icon area */}
      <Link href={href} target={isPdf ? '_blank' : undefined} className="block">
        <div className="aspect-video bg-gradient-to-br from-[#0f1825] to-[#0a1020] flex items-center justify-center relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 40%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 70% 70%, #1d4ed8 0%, transparent 40%)'
            }}
          />

          {isVideo ? (
            <>
              <VideoThumbnail
                videoId={video._id}
                title={video.title}
                cachedThumbnail={video.thumbnail}
                seekTo={5}
                className="absolute inset-0"
              />
              {/* Hover play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 z-10">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              </div>
            </>
          ) : isPdf ? (
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <span className="text-xs text-red-400 font-medium uppercase tracking-wider z-10">PDF</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 z-10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
            </div>
          )}

          {/* Size badge */}
          {video.size && (
            <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-gray-400 px-1.5 py-0.5 rounded font-mono z-10">
              {video.size}
            </span>
          )}

          {/* Ext badge */}
          <span className="absolute top-2 left-2 text-[10px] uppercase bg-black/50 text-gray-400 px-1.5 py-0.5 rounded font-mono z-10">
            {video.extension}
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <Link href={href} target={isPdf ? '_blank' : undefined}>
          <h3 className="text-white text-sm font-medium leading-snug line-clamp-2 hover:text-sv-accent transition-colors">
            {video.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mt-auto flex-wrap">
          <span className="text-[11px] text-sv-muted bg-sv-bg px-2 py-0.5 rounded-full">
            {video.category}
          </span>
          {video.directory && video.directory !== video.category && (
            <span className="text-[11px] text-sv-muted/60 bg-sv-bg px-2 py-0.5 rounded-full truncate max-w-[100px]">
              {video.directory}
            </span>
          )}
          {video.lastModified && (
            <span className="text-[11px] text-sv-muted ml-auto">{video.lastModified?.slice(0, 10)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-sv-border">
          {/* Like */}
          <button
            onClick={() => handleLike(liked ? 'unlike' : 'like')}
            disabled={busy}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              liked ? 'bg-sv-accent/15 text-sv-accent' : 'text-sv-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            {likes > 0 && <span>{likes}</span>}
          </button>

          {/* Dislike */}
          <button
            onClick={() => handleLike(disliked ? 'undislike' : 'dislike')}
            disabled={busy}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              disliked ? 'bg-red-500/15 text-red-400' : 'text-sv-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
            {dislikes > 0 && <span>{dislikes}</span>}
          </button>

          {/* Favourite */}
          <button
            onClick={handleFav}
            disabled={busy}
            className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              fav ? 'bg-yellow-500/15 text-yellow-400' : 'text-sv-muted hover:text-yellow-400 hover:bg-yellow-500/5'
            }`}
            title={fav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
