import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('Define MONGODB_URI in .env.local')

declare global {
  var _mongoCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}
const cache = global._mongoCache || (global._mongoCache = { conn: null, promise: null })

export async function connectDB() {
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }
  cache.conn = await cache.promise
  return cache.conn
}
