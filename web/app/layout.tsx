import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1930',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://vortexshield.lanonasis.com'),
  title: {
    default: 'VortexShield - Enterprise Security Infrastructure | Lan Onasis',
    template: '%s | VortexShield - Lan Onasis'
  },
  description: 'Enterprise-grade security infrastructure for cross-border safety. AES-256 encrypted secret management, API key lifecycle, MCP integration, and compliance-ready solutions. SOC 2, ISO 27001, GDPR compliant.',
  keywords: [
    'security infrastructure',
    'secrets management',
    'API key management',
    'MCP integration',
    'compliance automation',
    'enterprise security',
    'cross-border security',
    'Africa fintech security',
    'encryption',
    'SOC 2',
    'ISO 27001',
    'GDPR compliance',
    'PCI DSS',
    'OWASP',
    'audit logs',
    'access control',
    'RBAC',
    'AES-256 encryption',
    'security as a service',
    'African cybersecurity',
    'VortexCore ecosystem',
    'Lan Onasis'
  ],
  authors: [
    { name: 'Lan Onasis', url: 'https://lanonasis.com' }
  ],
  creator: 'Lan Onasis',
  publisher: 'Lan Onasis',
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vortexshield.lanonasis.com',
    siteName: 'VortexShield',
    title: 'VortexShield - Enterprise Security Infrastructure | Lan Onasis',
    description: 'Enterprise-grade security infrastructure for cross-border safety. AES-256 encrypted secret management, API key lifecycle, MCP integration. SOC 2, ISO 27001, GDPR compliant.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VortexShield - Enterprise Security Infrastructure',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@LanOnasis',
    creator: '@LanOnasis',
    title: 'VortexShield - Enterprise Security Infrastructure',
    description: 'Enterprise-grade security infrastructure for cross-border safety. AES-256 encrypted secret management, API key lifecycle, MCP integration.',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://vortexshield.lanonasis.com',
  },
  category: 'technology',
  classification: 'Business',
  other: {
    'geo.region': 'Africa',
    'geo.placename': 'Africa',
    'industry': 'Cybersecurity, Financial Technology, Compliance Technology',
    'target-audience': 'Financial Institutions, Enterprises, SaaS Platforms, Developers',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VortexShield',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web-based, Cross-platform',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: '14-day free trial available'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '127'
    },
    description: 'Enterprise-grade security infrastructure for cross-border safety. AES-256 encrypted secret management, API key lifecycle, MCP integration, and compliance-ready solutions.',
    featureList: [
      'AES-256-GCM Encrypted Secret Management',
      'API Key Lifecycle Management',
      'Model Context Protocol (MCP) Integration',
      'Immutable Audit Logs',
      'Role-Based Access Control (RBAC)',
      'SOC 2 Type II Compliance',
      'ISO 27001:2022 Certified',
      'GDPR Compliant',
      'PCI DSS 4.0 Ready'
    ],
    provider: {
      '@type': 'Organization',
      name: 'Lan Onasis',
      url: 'https://lanonasis.com',
      logo: 'https://lanonasis.com/logo.png',
      sameAs: [
        'https://twitter.com/LanOnasis',
        'https://linkedin.com/company/the-lan-onasis',
        'https://github.com/lanonasis'
      ]
    },
    screenshot: 'https://vortexshield.lanonasis.com/og-image.png',
    softwareVersion: '1.0.0',
    releaseNotes: 'Initial release with full security infrastructure suite',
    url: 'https://vortexshield.lanonasis.com'
  }

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VortexShield by Lan Onasis',
    alternateName: 'VortexShield',
    url: 'https://vortexshield.lanonasis.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://vortexshield.lanonasis.com/logo.png',
      width: '512',
      height: '512'
    },
    description: 'Enterprise security infrastructure for cross-border safety',
    parentOrganization: {
      '@type': 'Organization',
      name: 'Lan Onasis',
      url: 'https://lanonasis.com'
    },
    areaServed: {
      '@type': 'Place',
      name: 'Global'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'security@lanonasis.com',
      contactType: 'Security Support',
      availableLanguage: ['English']
    }
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
