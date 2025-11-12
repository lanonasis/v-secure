# VortexShield Pre-Deployment Checklist

Use this checklist before deploying to production.

## 🎨 Assets Generation

### Favicons

- [ ] Generate favicon suite at https://realfavicongenerator.net/
- [ ] Upload VortexShield logo (shield icon with brand colors)
- [ ] Download generated files
- [ ] Place in `web/public/`:
  - [ ] favicon.ico
  - [ ] favicon.svg
  - [ ] favicon-16x16.png
  - [ ] favicon-32x32.png
  - [ ] apple-touch-icon.png
  - [ ] android-chrome-192x192.png
  - [ ] android-chrome-512x512.png

### Social Media Images

- [ ] Create og-image.png (1200x630)
  - Include: VortexShield logo, shield icon
  - Text: "Enterprise Security Infrastructure"
  - Badges: "SOC 2 • ISO 27001 • GDPR"
  - Background: Gradient (#0A1930 → #4F46E5)
- [ ] Create twitter-image.png (1200x675)
  - Similar to OG image, optimized for Twitter
  - Text: "AES-256 • API Keys • MCP Integration"
- [ ] Create logo.png (512x512)
  - Clean VortexShield logo
  - Transparent or solid background
- [ ] Optimize all images (compress, < 200KB each)
- [ ] Place in `web/public/`

## 🔧 Configuration

### Environment

- [ ] Copy `.env.example` to `.env.local`
- [ ] Update `NEXT_PUBLIC_SITE_URL` if needed
- [ ] Set support email addresses
- [ ] Configure analytics IDs (if using)

### Domain

- [ ] Decide on domain: `vortexshield.lanonasis.com` or other
- [ ] Update all URLs in:
  - [ ] `app/layout.tsx` (metadataBase)
  - [ ] `public/sitemap.xml`
  - [ ] `public/robots.txt`
  - [ ] `public/.well-known/security.txt`

### Brand Consistency

- [ ] Verify colors match Lan Onasis brand
- [ ] Check typography (Inter font)
- [ ] Review all copy for consistency
- [ ] Ensure logo usage follows brand guidelines

## 🧪 Testing

### Local Testing

- [ ] Run `npm install`
- [ ] Run `npm run build` (no errors)
- [ ] Run `npm run type-check` (no errors)
- [ ] Run `npm run lint` (no errors)
- [ ] Test on `http://localhost:3000`
- [ ] Test all navigation links
- [ ] Test all CTA buttons
- [ ] Test responsive design (mobile, tablet, desktop)

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility

- [ ] Run Lighthouse accessibility audit (95+ score)
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Check color contrast ratios
- [ ] Verify alt text on all images

### Performance

- [ ] Run Lighthouse performance audit (90+ score)
- [ ] Check bundle size (< 500KB)
- [ ] Verify image optimization
- [ ] Test page load time (< 2s)
- [ ] Check Core Web Vitals

## 🔒 Security

### Headers

- [ ] Verify security headers in `netlify.toml`
- [ ] Test CSP policy (no console errors)
- [ ] Verify HSTS configuration
- [ ] Check X-Frame-Options
- [ ] Verify X-Content-Type-Options

### Content

- [ ] No API keys in code
- [ ] No sensitive data exposed
- [ ] security.txt properly configured
- [ ] Contact emails correct

## 📊 SEO

### Metadata

- [ ] Title tags optimized (< 60 chars)
- [ ] Meta descriptions compelling (< 160 chars)
- [ ] Keywords relevant and targeted
- [ ] Canonical URLs set correctly

### Structured Data

- [ ] Test JSON-LD with Google Rich Results Test
- [ ] Verify Organization schema
- [ ] Verify SoftwareApplication schema
- [ ] No validation errors

### Files

- [ ] robots.txt accessible
- [ ] sitemap.xml valid XML
- [ ] site.webmanifest valid JSON
- [ ] All URLs in sitemap are correct

### Social Media

- [ ] Test OG tags with Facebook Debugger
- [ ] Test Twitter Cards with Twitter Validator
- [ ] Test LinkedIn preview with Post Inspector
- [ ] Verify images load correctly

## 🚀 Deployment

### Pre-Deploy

- [ ] Commit all changes to git
- [ ] Push to GitHub/GitLab
- [ ] Tag release (e.g., v1.0.0)
- [ ] Update CHANGELOG.md

### Netlify Setup

- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Login: `netlify login`
- [ ] Initialize: `netlify init`
- [ ] Configure build settings:
  - Base directory: `web`
  - Build command: `npm run build`
  - Publish directory: `.next`

### Deploy

- [ ] Deploy preview: `npm run deploy:preview`
- [ ] Test preview URL thoroughly
- [ ] Deploy production: `npm run deploy`
- [ ] Verify production URL

### DNS Configuration

- [ ] Add CNAME record: `vortexshield` → `your-site.netlify.app`
- [ ] Wait for DNS propagation (up to 48 hours)
- [ ] Verify domain resolves correctly
- [ ] Enable HTTPS (automatic via Netlify)
- [ ] Force HTTPS redirect

## ✅ Post-Deployment

### Verification

- [ ] Site loads correctly at production URL
- [ ] All pages accessible
- [ ] All links working
- [ ] Images loading
- [ ] No console errors
- [ ] No 404 errors

### SEO Submission

- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify site ownership in both
- [ ] Request indexing for homepage

### Social Media Testing

- [ ] Share on Facebook (verify preview)
- [ ] Share on Twitter (verify card)
- [ ] Share on LinkedIn (verify preview)
- [ ] Fix any preview issues

### Performance Monitoring

- [ ] Run Lighthouse on production URL
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure Netlify Analytics (optional)
- [ ] Set up Google Analytics (optional)

### Security Testing

- [ ] Test SSL with SSL Labs (A+ rating)
- [ ] Verify security headers with securityheaders.com
- [ ] Check for mixed content warnings
- [ ] Test HTTPS enforcement

## 📈 Analytics & Monitoring

### Setup (Optional)

- [ ] Google Analytics configured
- [ ] Google Search Console verified
- [ ] Bing Webmaster Tools verified
- [ ] Uptime monitoring active
- [ ] Error tracking configured

### Baseline Metrics

- [ ] Record initial Lighthouse scores
- [ ] Note initial page load time
- [ ] Document initial SEO rankings
- [ ] Set performance budgets

## 📞 Communication

### Internal

- [ ] Notify team of deployment
- [ ] Share production URL
- [ ] Document any issues
- [ ] Schedule post-launch review

### External

- [ ] Update main site links (if applicable)
- [ ] Announce on social media (if applicable)
- [ ] Update documentation
- [ ] Notify stakeholders

## 🎯 Success Criteria

All must be ✅ before considering deployment successful:

- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 95+
- [ ] Lighthouse Best Practices: 95+
- [ ] Lighthouse SEO: 100
- [ ] Page load time: < 2 seconds
- [ ] Mobile responsive: All devices
- [ ] SSL rating: A+
- [ ] Security headers: A+
- [ ] No console errors
- [ ] All social previews working
- [ ] Sitemap indexed by Google

## 🆘 Rollback Plan

If issues occur:

1. [ ] Identify the issue
2. [ ] Check Netlify deploy logs
3. [ ] Rollback via Netlify Dashboard or CLI: `netlify rollback`
4. [ ] Fix issues locally
5. [ ] Test thoroughly
6. [ ] Redeploy

## 📚 Resources

- **Deployment Guide**: `DEPLOYMENT.md`
- **Asset Guide**: `public/ASSETS_README.md`
- **SEO Summary**: `SEO_SETUP_SUMMARY.md`
- **Netlify Docs**: https://docs.netlify.com/
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse

---

**Checklist Version**: 1.0
**Last Updated**: November 12, 2025
**Next Review**: Before each deployment
