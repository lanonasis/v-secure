# VortexShield Landing Page

Marketing landing page for VortexShield - Enterprise-grade security infrastructure for cross-border safety.

## Overview

This is the official marketing landing page for VortexShield, part of the LanOnasis platform suite. The page showcases VortexShield's enterprise-grade secret management, API key lifecycle, MCP integration, and compliance-ready security solutions.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.7.2
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React
- **Brand Kit:** @lanonasis/brand-kit

## Features

The landing page includes:

- ✅ Hero section with trust badges
- ✅ Core capabilities showcase
- ✅ Security standards & compliance section
- ✅ Developer-first API examples
- ✅ Industry use cases
- ✅ Compliance-ready features
- ✅ Call-to-action sections
- ✅ Responsive design
- ✅ SEO optimized

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm or yarn

### Installation

```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start the development server
npm run dev
# or
bun dev

# Open http://localhost:3000/vortexshield in your browser
```

The page will be available at `http://localhost:3000/vortexshield`

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Type Checking

```bash
# Run TypeScript type checking
npm run type-check
```

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   └── page.tsx            # Main VortexShield landing page
├── components/             # Reusable React components
├── styles/
│   └── globals.css         # Global styles and Tailwind
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── next.config.js         # Next.js configuration
```

## Configuration

### Base Path

The landing page is configured to run at `/vortexshield` path. This is configured in `next.config.js`:

```javascript
basePath: '/vortexshield',
assetPrefix: '/vortexshield',
```

### Customization

To customize the page:

1. **Colors:** Edit `tailwind.config.js` to modify the color scheme
2. **Content:** Edit `app/page.tsx` to update content
3. **Metadata:** Edit `app/layout.tsx` to update SEO metadata
4. **Styles:** Edit `styles/globals.css` for global styles

## Deployment

This Next.js app can be deployed to:

- **Vercel:** Optimized for Next.js (recommended)
- **Netlify:** Static export or serverless
- **AWS:** Using AWS Amplify or S3 + CloudFront
- **Self-hosted:** Using Docker or Node.js server

### Environment Variables

No environment variables are required for the landing page to run.

## Integration with Main Site

To integrate with the main lanonasis.com site:

1. Deploy this app to a subdirectory or microservice
2. Set up routing on the main site to redirect `/vortexshield` to this app
3. Ensure consistent navigation and branding across both sites

## Contributing

Please see the main repository [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Part of the LanOnasis Enterprise Security Service.
Licensed under MIT License. See [LICENSE](../LICENSE) for details.

## Support

- **Documentation:** https://docs.lanonasis.com
- **Email:** support@lanonasis.com
- **GitHub Issues:** https://github.com/lanonasis/v-secure/issues

---

**Built with:** Next.js • TypeScript • Tailwind CSS • LanOnasis Brand Kit
