import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arrow Agents SDR',
  description: 'SDR automation for WhatsApp, LinkedIn, and sheet-based outreach',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
