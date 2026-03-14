import type { Metadata } from 'next'
import { Sora, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const ibm  = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-body', display: 'swap' })

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'StreamVault'

export const metadata: Metadata = {
  title: `${APP_NAME}`,
  description: 'Browse and stream your educational video collection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${ibm.variable}`}>
      <body className="bg-sv-bg text-white font-body antialiased">{children}</body>
    </html>
  )
}
