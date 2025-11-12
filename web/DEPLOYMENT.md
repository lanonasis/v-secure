# VortexShield Deployment Guide

Complete guide for deploying VortexShield to Netlify with optimal SEO and performance.

## Pre-Deployment Checklist

### 1. Assets Preparation
- [ ] Generate favicon files (see `/public/ASSETS_README.md`)
- [ ] Create social media images (og-image.png, twitter-image.png)
- [ ] Add logo.png for structured data
- [ ] Optimize all images (compress PNGs, optimize SVGs)

### 2. Environment Configuration
- [ ] Set up custom domain (e.g., vortexshield.lanonasis.com)
- [ ] Configure DNS records
- [ ] Enable HTTPS/SSL
- [ ] Set up environment variables (if any)

### 3. SEO Verification
- [ ] Test metadata with [Meta Tags](https://metatags.io/)
- [ ] Validate Open Graph with [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Check Twitter Cards with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] Verify structured data with [Google Rich Results Test](https://search.google.com/test/rich-results)

## Netlify Deployment Steps

### Option 1: Netlify CLI (Recommended)

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   cd web
   netlify init
   ```

4. **Deploy Preview**
   ```bash
   npm run deploy:preview
   ```

5. **Deploy to Production**
   ```bash
   npm run deploy
   ```

### Option 2: GitHub Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: VortexShield landing page with SEO"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Select the `v-secure` repository

3. **Configure Build Settings**
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Install command: `npm install`

4. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy

## Custom Domain Setup

### 1. Add Custom Domain in Netlify
```
vortexshield.lanonasis.com
```

### 2. Configure DNS Records

Add these records to your DNS provider:

```
Type    Name                Value                           TTL
CNAME   vortexshield       your-site.netlify.app           3600
```

Or use Netlify DNS:
```
Type    Name                Value                           TTL
A       vortexshield       75.2.60.5                       3600
AAAA    vortexshield       2600:1f18:2148:bc00:...         3600
```

### 3. Enable HTTPS
- Netlify automatically provisions SSL via Let's Encrypt
- Force HTTPS redirect in Netlify settings

## Post-Deployment Tasks

### 1. Submit to Search Engines

**Google Search Console**
```bash
# Submit sitemap
https://vortexshield.lanonasis.com/sitemap.xml
```

**Bing Webmaster Tools**
```bash
# Submit sitemap
https://vortexshield.lanonasis.com/sitemap.xml
```

### 2. Verify SEO

Run these checks:
```bash
# Lighthouse audit
npx lighthouse https://vortexshield.lanonasis.com --view

# Check robots.txt
curl https://vortexshield.lanonasis.com/robots.txt

# Check sitemap
curl https://vortexshield.lanonasis.com/sitemap.xml

# Check security.txt
curl https://vortexshield.lanonasis.com/.well-known/security.txt
```

### 3. Test Social Media Previews

- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

### 4. Monitor Performance

Set up monitoring:
- Google Analytics (if needed)
- Netlify Analytics (built-in)
- Uptime monitoring (UptimeRobot, Pingdom)

## Environment Variables

If you need environment variables, add them in Netlify:

```bash
# Netlify Dashboard → Site settings → Environment variables
NEXT_PUBLIC_API_URL=https://api.lanonasis.com
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

Or via CLI:
```bash
netlify env:set NEXT_PUBLIC_API_URL "https://api.lanonasis.com"
```

## Performance Optimization

### 1. Enable Netlify Features
- ✅ Asset optimization (automatic)
- ✅ Image optimization (automatic)
- ✅ Brotli compression (automatic)
- ✅ HTTP/2 Server Push (automatic)

### 2. Configure Next.js
Already configured in `next.config.js`:
- ✅ SWC minification
- ✅ React strict mode
- ✅ Image optimization
- ✅ Standalone output

### 3. Monitor Core Web Vitals
```bash
# Run Lighthouse
npm run build
npx lighthouse https://vortexshield.lanonasis.com --view

# Target scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 100
```

## Continuous Deployment

### Automatic Deployments
Netlify automatically deploys when you push to:
- `main` branch → Production
- Other branches → Deploy previews

### Deploy Hooks
Create a deploy hook for manual triggers:
```bash
curl -X POST -d {} https://api.netlify.com/build_hooks/YOUR_HOOK_ID
```

## Rollback

If something goes wrong:
```bash
# Via CLI
netlify rollback

# Or via Dashboard
# Deploys → Select previous deploy → Publish deploy
```

## Troubleshooting

### Build Fails
```bash
# Check build logs in Netlify Dashboard
# Common issues:
# - Missing dependencies: npm install
# - Type errors: npm run type-check
# - Lint errors: npm run lint
```

### 404 Errors
- Check `netlify.toml` redirects
- Verify `_headers` file is in `/public`
- Ensure Next.js routing is correct

### Slow Performance
- Optimize images (use WebP, compress)
- Enable Netlify CDN
- Check bundle size: `npm run analyze`

## Security Checklist

- [x] HTTPS enabled
- [x] Security headers configured
- [x] CSP policy set
- [x] HSTS enabled
- [x] security.txt published
- [x] robots.txt configured
- [ ] Rate limiting (if needed)
- [ ] DDoS protection (Netlify provides basic)

## Support

- **Netlify Docs**: https://docs.netlify.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Lan Onasis Support**: security@lanonasis.com

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run linter
npm run type-check      # Check TypeScript

# Deployment
npm run deploy:preview  # Deploy preview
npm run deploy          # Deploy to production

# Netlify CLI
netlify dev             # Run local dev server
netlify deploy          # Deploy to Netlify
netlify open            # Open site in browser
netlify status          # Check deployment status
```

## Success Criteria

✅ Site loads in < 2 seconds
✅ Lighthouse score > 90 (all categories)
✅ All social media previews working
✅ Sitemap indexed by Google
✅ HTTPS enabled with A+ SSL rating
✅ Mobile responsive (test on multiple devices)
✅ Accessibility score 95+

---

**Last Updated**: November 12, 2025
**Maintained by**: Lan Onasis Team
