import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IVideo extends Document {
  url: string
  filename: string      // URL-decoded, human-readable
  title: string
  sourceUrl: string
  size?: string
  sizeBytes: number     // parsed numeric bytes — used for dedup
  lastModified?: string
  extension: string
  category: string
  directory: string
  thumbnail?: string    // base64 JPEG data-URL, generated client-side on first view
  duration?: number     // seconds
  quality?: string      // e.g. 1080p, 720p
  likes: number
  dislikes: number
  favoritedBy: string[]
  likedBy: string[]
  dislikedBy: string[]
  createdAt: Date
  updatedAt: Date
}

const VideoSchema = new Schema<IVideo>(
  {
    url:          { type: String, required: true, unique: true },
    filename:     { type: String, required: true },
    title:        { type: String, required: true },
    sourceUrl:    { type: String, required: true },
    size:         String,
    sizeBytes:    { type: Number, default: 0 },
    lastModified: String,
    extension:    { type: String, default: 'mp4' },
    category:     { type: String, default: 'General' },
    directory:    { type: String, default: '' },
    thumbnail:    { type: String, default: '' },  // base64 JPEG data-URL
    duration:     { type: Number, default: 0 },
    quality:      { type: String, default: '' },
    likes:        { type: Number, default: 0 },
    dislikes:     { type: Number, default: 0 },
    favoritedBy:  { type: [String], default: [] },
    likedBy:      { type: [String], default: [] },
    dislikedBy:   { type: [String], default: [] },
  },
  { timestamps: true }
)

// Indexes for fast queries
VideoSchema.index({ extension: 1 })
VideoSchema.index({ category: 1 })
VideoSchema.index({ duration: 1 })
VideoSchema.index({ quality: 1 })
VideoSchema.index({ title: 'text' })
// Compound index for dedup: same filename + same size = same file
VideoSchema.index({ filename: 1, sizeBytes: 1 })

const Video: Model<IVideo> =
  mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema)

export default Video
