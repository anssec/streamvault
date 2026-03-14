# StreamVault

Private educational video streaming platform. Crawls Apache/Nginx index pages recursively, saves unique video links to MongoDB, and streams them through an authenticated proxy — with likes, dislikes, and favourites per session.

---

## Features

- **Recursive crawler** — follows subdirectories up to 5 levels deep
- **Smart deduplication** — same video at different URLs stored only once (by filename + size)
- **Incremental crawl** — re-crawling only adds new videos, never overwrites existing ones
- **URL-decoded filenames** — `My%20Video.mp4` stored and displayed as `My Video`
- **JWT auth** — httpOnly cookie, 12h expiry, bcrypt passwords
- **Role-based access** — admin and viewer roles
- **35+ bot/crawler patterns blocked** — at middleware level
- **Full security headers** — CSP, X-Frame-Options, X-XSS-Protection, robots.txt
- **Custom video player** — seek, volume, speed, fullscreen, keyboard shortcuts
- **Likes / Dislikes / Favourites** — per browser session, no account needed

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Configure
```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/streamvault
JWT_SECRET=<run: openssl rand -base64 64>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
CRAWL_URLS=https://www.rfmri.org/Course/V3.0EN/
```

### 3. Run locally
```bash
npm run dev
```

### 4. First login
Go to `http://localhost:3000` → redirects to `/login`.
Use `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env.local`.
Admin account is auto-created in MongoDB on first login.

### 5. Crawl your videos
Go to `/admin` → Library Crawler → Start Crawl.

---

## Deploy to Vercel

```bash
npm i -g vercel && vercel
```

Set environment variables in Vercel dashboard → Project → Settings → Environment Variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `CRAWL_URLS`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Min 32 chars. Generate: `openssl rand -base64 64` |
| `ADMIN_USERNAME` | ✅ | First admin username (used on first startup only) |
| `ADMIN_PASSWORD` | ✅ | Min 8 chars |
| `CRAWL_URLS` | ✅ | Comma-separated index page URLs |

---

## How videos are stored

MongoDB stores only the **URL and metadata** — the actual video file stays on your server.

```json
{
  "url": "https://rfmri.org/Course/V3.0EN/1_Resting-State_fMRI.mp4",
  "filename": "1 Resting-State fMRI.mp4",
  "title": "1 Resting State fMRI",
  "size": "121M",
  "sizeBytes": 126877696,
  "extension": "mp4",
  "category": "V3.0EN",
  "directory": "V3.0EN",
  "likes": 0,
  "dislikes": 0,
  "favoritedBy": [],
  "likedBy": [],
  "dislikedBy": []
}
```

When a user plays a video, the browser requests `/api/stream/<id>`. The API looks up the URL from MongoDB and proxies the video bytes directly from the source server — the raw URL is never exposed to the browser.

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login → sets JWT cookie |
| POST | `/api/auth/logout` | Public | Clears cookie |
| GET | `/api/auth/me` | Any user | Current user info |
| GET | `/api/videos` | Any user | List/search/filter videos |
| GET | `/api/videos/[id]` | Any user | Single video |
| GET | `/api/stream/[id]` | Any user | Proxy video stream |
| GET | `/api/categories` | Any user | List categories |
| POST | `/api/user/likes` | Any user | Like/dislike |
| POST | `/api/user/favorites` | Any user | Toggle favourite |
| GET/POST/DELETE | `/api/users` | Admin | Manage accounts |
| GET/POST | `/api/crawl` | Admin | Crawl + library stats |

---

## Video Player Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause |
| `F` | Fullscreen |
| `M` | Mute |
| `←` / `→` | Seek ±10s |
| `↑` / `↓` | Volume ±10% |
