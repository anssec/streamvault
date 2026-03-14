import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import Video from '@/lib/models/Video'
import { crawlIndexPage, parseSize, VIDEO_EXTS } from '@/lib/crawler'

function categoryFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || 'General'
  } catch {
    return 'General'
  }
}

export async function POST(request: NextRequest) {
  // Auth: middleware + double-check
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let customUrls: string[] = []
  try {
    const body = await request.json()
    customUrls = Array.isArray(body.urls) ? body.urls : []
  } catch { /* no body is fine */ }

  const envUrls = (process.env.CRAWL_URLS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const urlsToScan = [...new Set([...envUrls, ...customUrls])]

  if (!urlsToScan.length) {
    return NextResponse.json(
      { error: 'No URLs configured. Add CRAWL_URLS to .env.local' },
      { status: 400 }
    )
  }

  await connectDB()

  const stats = {
    crawled:  0,
    inserted: 0,
    skipped:  0,    // already in DB (same name + size)
    errors:   [] as string[],
  }

  for (const indexUrl of urlsToScan) {
    let files
    try {
      files = await crawlIndexPage(indexUrl)
    } catch (err: any) {
      stats.errors.push(`Crawl failed for ${indexUrl}: ${err.message}`)
      continue
    }

    stats.crawled += files.length

    for (const file of files) {
      try {
        /**
         * Dedup strategy (cross-run incremental):
         *
         * Primary key  → url (exact URL match)
         * Secondary key → filename + sizeBytes (same file from different URL)
         *
         * We first check if this file already exists in the DB by either key.
         * If it does → skip (already indexed).
         * If not → insert fresh.
         *
         * This means:
         *  - Re-crawling the same server → 0 new inserts (all skipped)
         *  - Adding a new video to the server → exactly 1 new insert
         *  - Same video appearing at two different URLs → only stored once
         */
        const sizeBytes = file.sizeBytes ?? parseSize(file.size ?? '')

        const existing = await Video.findOne({
          $or: [
            { url: file.url },
            // Same filename + same size = same file (allow ±1 byte rounding)
            {
              filename:  file.filename,
              sizeBytes: { $gt: 0, $gte: sizeBytes - 1, $lte: sizeBytes + 1 },
            },
          ],
        }).select('_id').lean()

        if (existing) {
          stats.skipped++
          continue
        }

        await Video.create({
          url:          file.url,
          filename:     file.filename,
          title:        file.title,
          sourceUrl:    indexUrl,
          size:         file.size,
          sizeBytes,
          lastModified: file.lastModified,
          extension:    file.extension,
          category:     categoryFromUrl(indexUrl),
          directory:    file.directory || '',
          likes:        0,
          dislikes:     0,
          favoritedBy:  [],
          likedBy:      [],
          dislikedBy:   [],
        })

        stats.inserted++
      } catch (err: any) {
        // Catch race-condition duplicate key errors gracefully
        if (err?.code === 11000) {
          stats.skipped++
        } else {
          stats.errors.push(`${file.filename}: ${err.message}`)
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Crawled ${urlsToScan.length} source URL(s), found ${stats.crawled} files`,
    stats,
  })
}

// GET — library stats (admin only)
export async function GET(request: NextRequest) {
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  await connectDB()
  const [total, videoCount, categories] = await Promise.all([
    Video.countDocuments(),
    Video.countDocuments({ extension: { $in: VIDEO_EXTS } }),
    Video.distinct('category'),
  ])
  return NextResponse.json({ total, videos: videoCount, categories })
}
