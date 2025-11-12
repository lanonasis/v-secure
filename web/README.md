# VortexShield Landing Page

Enterprise-grade security infrastructure for cross-border safety. Part of the Lan Onasis VortexCore ecosystem.

## 🚀 Features

- **SEO Optimized**: Comprehensive metadata, Open Graph, Twitter Cards, structured data (JSON-LD)
- **Performance**: Next.js 14 with SWC, optimized builds, image optimization
- **Security**: Security headers, CSP, HSTS, security.txt (RFC 9116)
- **Compliance**: SOC 2, ISO 27001, GDPR, PCI DSS ready
- **Responsive**: Mobile-first design with Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliant

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Netlify account (for deployment)

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🏗️ Build

```bash
# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with metadata & SEO
│   └── page.tsx            # Homepage
├── public/
│   ├── .well-known/
│   │   └── security.txt    # Security contact (RFC 9116)
│   ├── robots.txt          # Search engine directives
│   ├── sitemap.xml         # Site structure for SEO
│   ├── site.webmanifest    # PWA manifest
│   ├── _headers            # Netlify headers
│   └── ASSETS_README.md    # Asset generation guide
├── styles/
│   └── globals.css         # Global styles with Tailwind
├── netlify.toml            # Netlify configuration
├── next.config.js          # Next.js configuration
├── DEPLOYMENT.md           # Deployment guide
└── package.json
```

## 🎨 Brand Assets

This project uses `@lanonasis/brand-kit` for consistent branding.

### Required Assets (Not Included)

Generate these before deployment:

- Favicons (16x16, 32x32, 180x180, 192x192, 512x512)
- Social media images (og-image.png, twitter-image.png)
- Logo files (logo.png)

See `/public/ASSETS_README.md` for detailed instructions.

## 🌐 Deployment

### Quick Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run deploy
```

See `DEPLOYMENT.md` for complete deployment guide.

## 🔍 SEO Checklist

- [x] Meta tags (title, description, keywords)
- [x] Open Graph tags (Facebook, LinkedIn)
- [x] Twitter Card tags
- [x] Structured data (JSON-LD)
- [x] Canonical URLs
- [x] robots.txt
- [x] sitemap.xml
- [x] security.txt
- [x] Favicon suite
- [ ] Social media images (need to generate)
- [ ] Submit to search engines

## 🔒 Security

- Security headers configured (CSP, HSTS, X-Frame-Options)
- security.txt for responsible disclosure
- HTTPS enforced
- No sensitive data in client code

## 📊 Performance

Target Lighthouse scores:

- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build

# Lighthouse audit (after deployment)
npx lighthouse https://vortexshield.lanonasis.com --view
```

## 🤝 Contributing

This is part of the Lan Onasis platform. For contributions:

1. Follow the brand guidelines
2. Maintain SEO best practices
3. Ensure accessibility compliance
4. Test on multiple devices

## 📝 License

MIT License - See LICENSE file for details

## 🔗 Links

- **Main Site**: https://lanonasis.com
- **Documentation**: https://docs.lanonasis.com/vortexshield
- **GitHub**: https://github.com/lanonasis/v-secure
- **Support**: security@lanonasis.com

## 📞 Support

- **Security Issues**: security@lanonasis.com
- **General Support**: support@lanonasis.com
- **Sales**: sales@lanonasis.com

---

**Built with ❤️ by Lan Onasis**
