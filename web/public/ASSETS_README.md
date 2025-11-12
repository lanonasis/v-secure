# VortexShield Web Assets

This directory contains all web assets for VortexShield landing page.

## Required Assets

### Favicons & Icons
Generate these from your VortexShield logo using a favicon generator like [RealFaviconGenerator](https://realfavicongenerator.net/):

- `favicon.ico` (32x32, multi-size)
- `favicon.svg` (vector, preferred for modern browsers)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

### Social Media Images
Create these with your brand colors (#0A1930, #4F46E5, #7C3AED):

- `og-image.png` (1200x630) - Open Graph image for Facebook, LinkedIn
- `twitter-image.png` (1200x675) - Twitter card image
- `logo.png` (512x512) - Square logo for structured data

### Design Guidelines
Based on Lan Onasis brand:
- **Primary Color**: #0A1930 (Dark Navy)
- **Accent Colors**: 
  - Blue: #4F46E5
  - Indigo: #6366F1
  - Purple: #7C3AED
- **Typography**: Inter (from Google Fonts)
- **Style**: Modern, professional, security-focused

### Image Content Suggestions

#### og-image.png (1200x630)
- VortexShield logo + shield icon
- Headline: "Enterprise Security Infrastructure"
- Subheadline: "SOC 2 • ISO 27001 • GDPR Compliant"
- Background: Gradient from dark navy to indigo
- Include subtle security-themed graphics (locks, shields, encryption symbols)

#### twitter-image.png (1200x675)
- Similar to OG image but optimized for Twitter's aspect ratio
- More compact text layout
- Emphasize key features: "AES-256 Encryption • API Key Management • MCP Integration"

#### logo.png (512x512)
- Clean VortexShield logo
- Transparent or solid background
- High resolution for various uses

## Using @lanonasis/brand-kit

You have access to the Lan Onasis brand kit package. Use it to maintain brand consistency:

\`\`\`typescript
import { colors, logos, fonts } from '@lanonasis/brand-kit';
\`\`\`

## Asset Optimization

Before deployment:
1. Compress all PNG images (use TinyPNG or similar)
2. Optimize SVG files (use SVGO)
3. Ensure all images have proper alt text in code
4. Test social media previews using:
   - Facebook Sharing Debugger
   - Twitter Card Validator
   - LinkedIn Post Inspector

## Current Status

✅ robots.txt - Configured
✅ sitemap.xml - Configured
✅ site.webmanifest - Configured
✅ security.txt - Configured
⏳ Favicon files - Need to be generated
⏳ Social media images - Need to be created
⏳ Logo files - Need to be added

## Quick Setup

1. Generate favicons from your logo at https://realfavicongenerator.net/
2. Create social media images using Figma/Canva with dimensions above
3. Place all files in this `/public` directory
4. Test with: `npm run build` and check for any missing asset warnings
