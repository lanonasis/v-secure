# VortexShield Quick Reference

## 🌐 Live URLs

**Production**: https://v-secure.netlify.app
**Admin**: https://app.netlify.com/projects/v-secure

## 🚀 Deploy Commands

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# Build locally
netlify build

# Run dev server
cd web && npm run dev
```

## 📁 Key Files

```
v-secure/
├── netlify.toml              # Root config (points to web/)
├── web/
│   ├── app/
│   │   ├── layout.tsx        # SEO metadata
│   │   └── page.tsx          # Homepage
│   ├── public/
│   │   ├── favicon.ico       # ✅ From brand-kit
│   │   ├── og-image.png      # ✅ From brand-kit
│   │   ├── robots.txt        # ✅ Configured
│   │   └── sitemap.xml       # ✅ Configured
│   └── package.json
└── DEPLOYMENT_SUCCESS.md     # This deployment
```

## 🔧 Common Tasks

### Update Content

```bash
# Edit homepage
code web/app/page.tsx

# Update SEO
code web/app/layout.tsx

# Deploy changes
git add . && git commit -m "update" && git push
# Auto-deploys via Netlify
```

### Check Status

```bash
netlify status
netlify open:site
netlify open:admin
```

### View Logs

```bash
netlify logs
netlify functions:log
```

## 🎨 Brand Assets

**Source**: `@lanonasis/brand-kit@1.0.1`

**Colors**:

- Primary: #0A1930
- Blue: #4F46E5
- Indigo: #6366F1
- Purple: #7C3AED

**Assets Location**: `web/public/`

## 📊 Performance

**Build**: 1m 33s
**First Load JS**: 96.1 kB
**Target Lighthouse**: 90+ all categories

## 🔒 Security

**HTTPS**: ✅ Enabled
**HSTS**: ✅ Configured
**CSP**: ✅ Configured
**security.txt**: ✅ Available

## 📞 Support

**Security**: security@lanonasis.com
**Support**: support@lanonasis.com
**Docs**: See `web/` directory

## ⚡ Quick Fixes

### Rebuild

```bash
netlify build
netlify deploy --prod
```

### Rollback

```bash
netlify rollback
```

### Clear Cache

```bash
netlify build --clear-cache
```

## 📝 Next Steps

1. Configure custom domain: `vortexshield.lanonasis.com`
2. Run Lighthouse audit
3. Test social media previews
4. Submit sitemap to Google/Bing
5. Set up monitoring

---

**Status**: 🟢 LIVE
**Last Deploy**: November 12, 2025
**Version**: 1.0.0
