import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'VortexShield - Enterprise Security Infrastructure | LanOnasis',
  description: 'Security infrastructure for cross-border safety. Enterprise-grade secret management, API key lifecycle, MCP integration, and compliance-ready security solutions.',
  keywords: ['security', 'secrets management', 'API keys', 'compliance', 'enterprise security', 'cross-border', 'Africa', 'encryption'],
  authors: [{ name: 'LanOnasis' }],
  openGraph: {
    title: 'VortexShield - Enterprise Security Infrastructure',
    description: 'Security infrastructure for cross-border safety',
    type: 'website',
    url: 'https://lanonasis.com/vortexshield',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
