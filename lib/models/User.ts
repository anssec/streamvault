import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  username: string
  passwordHash: string
  role: 'admin' | 'viewer'
  createdAt: Date
  lastLogin?: Date
  comparePassword(plain: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
    lastLogin:    { type: Date },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash)
}

// Ensure we never expose passwordHash in JSON responses
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ret as any).passwordHash
    return ret
  },
})

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User