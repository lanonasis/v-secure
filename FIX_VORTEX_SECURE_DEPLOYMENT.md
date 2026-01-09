# Fix Vortex-Secure Deployment Issue

## ⚠️ Current Problem
Vercel project `vortex-secure` has incorrect root directory setting, causing deployment failures.

**Error**: `The provided path "~/dev-hub/lan-onasis-monorepo/apps/v-secure/vortex-secure/vortex-secure" does not exist`

## ✅ Solution: Fix Root Directory in Vercel Dashboard

### Step 1: Access Vercel Dashboard
1. Go to: https://vercel.com/onasis-team/vortex-secure/settings
2. Navigate to **General** tab
3. Scroll to **Root Directory** section

### Step 2: Update Root Directory
**Current (wrong)**: `vortex-secure/vortex-secure` or similar
**Correct**: `apps/v-secure/vortex-secure` OR **leave empty**

### Step 3: Save and Redeploy
1. Click **Save** button
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or trigger via CLI: `vercel --prod`

## 📋 Configuration Verification

### Check microfrontends.json exists:
```bash
cd apps/v-secure
ls -la microfrontends.json
```

### Check build commands include microfrontends config:
```bash
# In both apps
VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build
```

### Check Vercel project settings:
- **Root Directory**: `apps/v-secure/vortex-secure` (or empty)
- **Framework**: `Vite`
- **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`
- **Package Manager**: `Bun`

## 🎯 Expected Result

After fixing the root directory:

✅ **Build succeeds** - No more path errors
✅ **Deployment completes** - App deploys to Vercel
✅ **Routing works** - `/dashboard/*` routes to vortex-secure
✅ **Microfrontends active** - Both apps work together

## 🚀 Quick Test After Fix

Once deployed, verify:
- `https://v-secure.vercel.app/` → Main app (Next.js)
- `https://v-secure.vercel.app/dashboard` → Dashboard app (Vite)

## 📞 Support

If this doesn't work:
1. Check Vercel build logs for specific errors
2. Verify `microfrontends.json` content
3. Ensure both projects are in the same Vercel team
4. Confirm environment variables are set

## 📝 Next Steps

After vortex-secure deploys successfully:
1. ✅ Main app deployed
2. ✅ Dashboard app deployed
3. ⏳ Test microfrontends routing
4. ⏳ Configure domain/subdomain
5. ⏳ Set up environment variables