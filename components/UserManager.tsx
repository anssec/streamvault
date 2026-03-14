'use client'

import { useState, useEffect } from 'react'

interface User {
  _id: string
  username: string
  role: 'admin' | 'viewer'
  createdAt: string
  lastLogin?: string
}

export default function UserManager() {
  const [users, setUsers]         = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  // New user form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole]         = useState<'viewer' | 'admin'>('viewer')
  const [showPass, setShowPass]       = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create user'); return }
      setSuccess(`User "${newUsername}" created successfully`)
      setNewUsername(''); setNewPassword(''); setNewRole('viewer'); setShowForm(false)
      await loadUsers()
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(username: string) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return
    setDeleting(username); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to delete user'); return }
      setSuccess(`User "${username}" deleted`)
      await loadUsers()
    } catch {
      setError('Network error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-display font-semibold text-lg">User Accounts</h2>
        <button
          onClick={() => { setShowForm(f => !f); setError(''); setSuccess('') }}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-sv-accent hover:bg-sv-accent-hover text-white rounded-lg transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d={showForm ? 'M18 6 6 18M6 6l12 12' : 'M12 5v14M5 12h14'}/>
          </svg>
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {success}
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <form onSubmit={handleCreate}
          className="bg-sv-card border border-sv-border rounded-2xl p-5 space-y-4 animate-fade-up">
          <h3 className="text-white font-semibold text-sm">New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="e.g. john_doe"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_-]+"
                className="w-full bg-sv-bg border border-sv-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-sv-muted focus:outline-none focus:border-sv-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-sv-bg border border-sv-border rounded-xl px-3 py-2.5 pr-9 text-sm text-white placeholder-sv-muted focus:outline-none focus:border-sv-accent transition-colors"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sv-muted hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPass
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as 'viewer' | 'admin')}
                className="w-full bg-sv-bg border border-sv-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sv-accent transition-colors cursor-pointer">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={creating}
            className="px-5 py-2 bg-sv-accent hover:bg-sv-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
            {creating
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating…</>
              : <>Create User</>
            }
          </button>
        </form>
      )}

      {/* User list */}
      <div className="bg-sv-card border border-sv-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sv-muted text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sv-muted text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sv-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-sv-muted uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-sv-muted uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-sv-muted uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user._id}
                  className={`${i < users.length - 1 ? 'border-b border-sv-border' : ''} hover:bg-white/[0.02] transition-colors`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sv-accent/15 border border-sv-accent/20 flex items-center justify-center text-sv-accent font-bold text-xs flex-shrink-0">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-sv-accent/15 text-sv-accent'
                        : 'bg-white/5 text-sv-muted'
                    }`}>
                      {user.role === 'admin' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      )}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sv-muted hidden md:table-cell">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-sv-border italic">Never</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(user.username)}
                      disabled={deleting === user.username}
                      className="text-xs text-sv-muted hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {deleting === user.username ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
