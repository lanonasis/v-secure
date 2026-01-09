# Vercel Schema Validation Fix

## ✅ Issue Resolved

**Error**: `should NOT have additional property 'rootDirectory'`

**Root Cause**: The `rootDirectory` property is not valid in `vercel.json` files.

## 🔧 What Was Fixed

### Removed Invalid Property
- Removed `rootDirectory` from `apps/v-secure/vercel.json`
- This property cannot be set in `vercel.json` - it must be configured in the Vercel dashboard

### Updated Configuration
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "bun install",
  "buildCommand": "VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build",
  "outputDirectory": ".next",
  "packageManager": "bun@1.3.4",
  "env": {
    "VC_MICROFRONTENDS_CONFIG": "../microfrontends.json"
  }
}
```

## 📋 How Root Directory Works in Vercel

### ❌ Cannot Set in vercel.json
```json
{
  "rootDirectory": "web"  // ❌ INVALID - causes schema error
}
```

### ✅ Set in Vercel Dashboard
1. Go to Vercel project settings
2. Navigate to **General** → **Root Directory**
3. Set the path relative to your repository root

### ✅ Or Deploy from Correct Directory
The easiest approach is to deploy each app from its own directory:

```bash
# Deploy web app
cd apps/v-secure/web
vercel --prod

# Deploy vortex-secure app
cd apps/v-secure/vortex-secure
vercel --prod
```

## 🚀 Next Steps

1. ✅ Schema validation error fixed
2. ⏳ Fix vortex-secure root directory in Vercel dashboard
3. ⏳ Redeploy vortex-secure app
4. ⏳ Test microfrontends routing

## 📝 Summary

- `rootDirectory` cannot be set in `vercel.json`
- Must be configured in Vercel dashboard or by deploying from correct directory
- All other vercel.json configurations are now valid
- Ready for deployment once dashboard settings are updated