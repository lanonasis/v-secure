# 🚀 VortexShield Quick Start Guide

Get VortexShield deployed in 3 steps!

## Step 1: Generate Assets (15 minutes)

### Favicons

1. Go to https://realfavicongenerator.net/
2. Upload your VortexShield logo
3. Download the generated package
4. Extract to `web/public/`

### Social Media Images

Create these 3 images (use Figma/Canva):

**og-image.png** (1200x630)

- VortexShield logo + shield icon
- Text: "Enterprise Security Infrastructure"
- Badges: "SOC 2 • ISO 27001 • GDPR"
- Colors: #0A1930 → #4F46E5 gradient

**twitter-image.png** (1200x675)

- Similar design, Twitter optimized
- Text: "AES-256 • API Keys • MCP"

**logo.png** (512x512)

- Clean VortexShield logo

Save all to `web/public/`

## Step 2: Deploy to Netlify (10 minutes)

### Option A: Netlify CLI (Fastest)

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy from web directory
cd web
netlify init
npm run deploy
```

### Option B: GitHub Integration

```bash
# Push to GitHub
git add .
git commit -m "feat: VortexShield landing page"
git push origin main

# Then in Netlify Dashboard:
# 1. New site → Import from Git
# 2. Select repository
# 3. Base directory: web
# 4. Build command: npm run build
# 5. Publish directory: .next
# 6. Deploy!
```

## Step 3: Configure Domain (5 minutes)

### In Netlify Dashboard

1. Go to Domain settings
2. Add custom domain: `vortexshield.lanonasis.com`
3. Follow DNS instructions

### In Your DNS Provider

Add CNAME record:

```
Type: CNAME
Name: vortexshield
Value: your-site.netlify.app
TTL: 3600
```

### Enable HTTPS

- Netlify auto-provisions SSL (Let's Encrypt)
- Enable "Force HTTPS" in Netlify settings

## ✅ Verify Deployment

### Quick Checks

```bash
# Test site loads
curl -I https://vortexshield.lanonasis.com

# Check robots.txt
curl https://vortexshield.lanonasis.com/robots.txt

# Run Lighthouse
npx lighthouse https://vortexshield.lanonasis.com --view
```

### Test Social Previews

- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/

## 🎯 Success Criteria

You're done when:

- ✅ Site loads at your domain
- ✅ HTTPS is enabled (green lock)
- ✅ Social media previews show images
- ✅ Lighthouse score > 90 (all categories)
- ✅ No console errors

## 📚 Need More Details?

- **Full deployment guide**: See `DEPLOYMENT.md`
- **Asset specifications**: See `public/ASSETS_README.md`
- **Pre-deployment checklist**: See `PRE_DEPLOYMENT_CHECKLIST.md`
- **SEO summary**: See `SEO_SETUP_SUMMARY.md`

## 🆘 Troubleshooting

### Build fails

```bash
npm run type-check  # Check for TypeScript errors
npm run lint        # Check for linting errors
npm run build       # Test build locally
```

### Images not showing

- Check files are in `web/public/`
- Verify filenames match exactly
- Clear browser cache

### Domain not working

- Wait 24-48 hours for DNS propagation
- Verify CNAME record is correct
- Check Netlify domain settings

## 📞 Support

- **Email**: security@lanonasis.com
- **Docs**: https://docs.lanonasis.com
- **GitHub**: https://github.com/lanonasis/v-secure

---

**Total Time**: ~30 minutes
**Difficulty**: Easy
**Prerequisites**: Node.js 18+, Netlify account
