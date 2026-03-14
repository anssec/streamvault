// Client-side only — generates a persistent anonymous session ID
// stored in localStorage to track likes/dislikes/favourites per browser
export function getClientSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('sv_session')
  if (!id) {
    const arr = new Uint8Array(16)
    window.crypto.getRandomValues(arr)
    id = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('sv_session', id)
  }
  return id
}
