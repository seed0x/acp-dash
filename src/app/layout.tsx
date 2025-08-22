import './globals.css'
import type { Metadata, Viewport } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'ACP — Operations',
  description: 'All County Plumbing — CRM / Scheduling Dashboard',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'hsl(222 47% 11%)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`min-h-screen bg-background text-foreground`}>
        <main>{children}</main>
      </body>
    </html>
  )
}