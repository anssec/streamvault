export interface CrawledFile {
  url: string
  filename: string      // URL-decoded, human-readable
  title: string         // cleaned human-readable title
  size?: string
  sizeBytes?: number    // parsed numeric bytes for dedup comparison
  lastModified?: string
  extension: string
  directory: string
}

export const VIDEO_EXTS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v']
const ALL_EXTS = [...VIDEO_EXTS, 'pdf', 'zip']

// Max directory depth to recurse (prevents infinite loops)
const MAX_DEPTH = 5

// ── Filename cleaning ────────────────────────────────────────────────────────

/**
 * Fully decode a URL-encoded filename and convert to human-readable title.
 * Examples:
 *   "Bride4K.24.06.28.Andrea%20HD.mp4"  → "Bride4K 24 06 28 Andrea HD"
 *   "1_Resting-State_fMRI.mp4"          → "1 Resting State fMRI"
 *   "Bang.Surprise.24.04.04.Eliza.mp4"  → "Bang Surprise 24 04 04 Eliza"
 */
function decodeFilename(raw: string): string {
  // Step 1: URL-decode (%20 → space, %28 → (, etc.)
  let name = raw
  try {
    name = decodeURIComponent(raw)
  } catch {
    // If decoding fails, use as-is
  }
  return name
}

function cleanTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/[._]+/g, ' ')            // dots and underscores → space
    .replace(/-+/g, ' ')               // hyphens → space
    .replace(/\s+/g, ' ')              // collapse multiple spaces
    .trim()
}

function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// ── Size parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a human size string like "1.2G", "695M", "376K" into bytes.
 * Used for duplicate detection by name + approximate size.
 */
export function parseSize(sizeStr: string): number {
  if (!sizeStr) return 0
  const match = sizeStr.match(/^([\d.,]+)\s*([KMGT]?)$/i)
  if (!match) return 0
  const num = parseFloat(match[1].replace(',', '.'))
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    '': 1,
    'K': 1024,
    'M': 1024 ** 2,
    'G': 1024 ** 3,
    'T': 1024 ** 4,
  }
  return Math.round(num * (multipliers[unit] ?? 1))
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'StreamVault-Indexer/1.0',
        'Accept': 'text/html,*/*',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err: any) {
    clearTimeout(timer)
    throw new Error(`Fetch failed for ${url}: ${err.message}`)
  }
}

// ── Main crawler ─────────────────────────────────────────────────────────────

/**
 * Recursively crawls an Apache/Nginx directory listing.
 *
 * Deduplication strategy (within a single crawl run):
 *   - By URL (exact match)
 *   - By normalised filename + approximate size (±5%)
 *     → same video hosted in two places won't be returned twice
 *
 * Incremental inserts (across crawl runs) are handled in the API route
 * using MongoDB upsert keyed on (filename + sizeBytes).
 */
export async function crawlIndexPage(
  indexUrl: string,
  _seenUrls: Set<string> = new Set(),
  _seenKeys: Set<string> = new Set(),   // "normalised-name::sizeBytes" dedup keys
  _depth: number = 0
): Promise<CrawledFile[]> {
  const base = indexUrl.endsWith('/') ? indexUrl : indexUrl + '/'

  if (_depth > MAX_DEPTH || _seenUrls.has(base)) return []
  _seenUrls.add(base)

  let html: string
  try {
    html = await fetchHtml(base)
  } catch (err: any) {
    console.error(`[crawler] Skipping ${base}: ${err.message}`)
    return []
  }

  const results: CrawledFile[] = []
  const rows = html.split(/<tr[\s>]|<\/tr>/i)
  const hrefRe = /<a[^>]+href="([^"]+)"[^>]*>/gi

  // Human-readable directory label for this level
  const pathParts = new URL(base).pathname.split('/').filter(Boolean)
  const rawDirName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'Root'
  const directory = decodeURIComponent(rawDirName)

  const subDirs: string[] = []

  let match: RegExpExecArray | null
  while ((match = hrefRe.exec(html)) !== null) {
    const href = match[1].trim()

    // Skip navigation, absolute URLs, parent links
    if (
      href.startsWith('?') ||
      href.startsWith('#') ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href === '../' ||
      href === './'
    ) continue

    // ── Subdirectory → queue for recursion ───────────────────────────
    if (href.endsWith('/')) {
      const subUrl = base + href
      if (!_seenUrls.has(subUrl)) subDirs.push(subUrl)
      continue
    }

    // ── File ──────────────────────────────────────────────────────────
    // URL-decode the raw href component to get the real filename
    const rawFilename  = href.split('/').pop() || href
    const filename     = decodeFilename(rawFilename)   // human-readable
    const ext          = getExt(filename)

    if (!ALL_EXTS.includes(ext)) continue

    const fullUrl = base + rawFilename   // keep encoded in URL
    if (_seenUrls.has(fullUrl)) continue
    _seenUrls.add(fullUrl)

    // Extract size and date from surrounding row text
    const rowText = rows.find(r => r.includes(rawFilename)) || ''
    let size: string | undefined
    let sizeBytes = 0
    let lastModified: string | undefined

    const sizeMatch = rowText.match(/(\d+[.,]?\d*\s*[KMGTkmgt])\s*(?:<|\s)/i)
    if (sizeMatch) {
      size      = sizeMatch[1].replace(/\s/g, '')
      sizeBytes = parseSize(size)
    }

    const dateMatch = rowText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/)
    if (dateMatch) lastModified = dateMatch[1]

    // ── Deduplicate by name + size within this crawl run ─────────────
    // Normalise name: lowercase, strip extension, collapse whitespace
    const normName = cleanTitle(filename).toLowerCase()
    // Allow 5% size tolerance to catch same file re-encoded at slightly different size
    const sizeBucket = sizeBytes > 0 ? Math.round(sizeBytes / (sizeBytes * 0.05 + 1)) : 0
    const dedupKey   = `${normName}::${sizeBucket}`

    if (_seenKeys.has(dedupKey)) continue
    _seenKeys.add(dedupKey)

    results.push({
      url: fullUrl,
      filename,                         // decoded, human-readable
      title: cleanTitle(filename),      // further cleaned title
      size,
      sizeBytes,
      lastModified,
      extension: ext,
      directory,
    })
  }

  // ── Recurse into subdirectories ───────────────────────────────────────
  for (const subDir of subDirs) {
    const sub = await crawlIndexPage(subDir, _seenUrls, _seenKeys, _depth + 1)
    results.push(...sub)
  }

  return results
}
