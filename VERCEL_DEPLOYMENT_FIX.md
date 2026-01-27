# Vercel Microfrontends Deployment Fix

## Issues Identified and Fixed

### 1. Missing Microfrontends Config in Build Commands
**Problem**: The `vercel.json` files didn't include the `VC_MICROFRONTENDS_CONFIG` environment variable in build commands.

**Fix**: Added `VC_MICROFRONTENDS_CONFIG=../microfrontends.json` to all build commands.

### 2. Package Manager Mismatch
**Problem**: `vortex-secure/vercel.json` was using `npm` instead of `bun`.

**Fix**: Updated to use `bun` with version `1.3.4` to match the monorepo setup.

### 3. Environment Variable Configuration
**Problem**: Environment variables weren't explicitly set in Vercel configuration.

**Fix**: Added `env` section to all `vercel.json` files to ensure the microfrontends config path is available.

## Fixed Configuration Files

### Root `apps/v-secure/vercel.json`
```json
{
  "framework": "nextjs",
  "rootDirectory": "web",
  "buildCommand": "VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build",
  "env": {
    "VC_MICROFRONTENDS_CONFIG": "../microfrontends.json"
  }
}
```

### `apps/v-secure/web/vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build",
  "env": {
    "VC_MICROFRONTENDS_CONFIG": "../microfrontends.json"
  }
}
```

### `apps/v-secure/vortex-secure/vercel.json`
```json
{
  "framework": "vite",
  "buildCommand": "VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build",
  "packageManager": "bun@1.3.4",
  "env": {
    "VC_MICROFRONTENDS_CONFIG": "../microfrontends.json"
  }
}
```

## Deployment Setup

### Option 1: Deploy from Root (Recommended)

1. **Connect to Vercel**
   - Go to Vercel Dashboard
   - Import project from Git
   - Select the `lan-onasis-monorepo` repository

2. **Configure Root Project** (`apps/v-secure/`)
   - **Root Directory**: `apps/v-secure`
   - **Framework Preset**: Next.js
   - **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`
   - **Output Directory**: `web/.next`
   - **Install Command**: `bun install`
   - **Package Manager**: Bun

3. **Configure Web App** (Separate Project)
   - Create a new project in Vercel for `apps/v-secure/web`
   - **Root Directory**: `apps/v-secure/web`
   - **Framework Preset**: Next.js
   - **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`
   - **Output Directory**: `.next`
   - **Install Command**: `bun install`

4. **Configure Vortex-Secure App** (Separate Project)
   - Create a new project in Vercel for `apps/v-secure/vortex-secure`
   - **Root Directory**: `apps/v-secure/vortex-secure`
   - **Framework Preset**: Vite
   - **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`
   - **Output Directory**: `dist`
   - **Install Command**: `bun install`

### Option 2: Monorepo Setup (Single Project)

If deploying as a monorepo:

1. **Root Configuration**
   - **Root Directory**: `apps/v-secure`
   - **Build Command**: `cd web && VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`
   - **Output Directory**: `web/.next`

2. **Add Environment Variables in Vercel Dashboard**
   ```
   VC_MICROFRONTENDS_CONFIG=../microfrontends.json
   NODE_ENV=production
   ```

## Microfrontends Configuration

The `microfrontends.json` file is located at:
```
apps/v-secure/microfrontends.json
```

It defines:
- **v-secure**: Main web app (Next.js) on port 3000
- **vortex-secure**: Dashboard app (Vite) on port 5173, routes `/dashboard/*`

## Verification Steps

### 1. Local Build Test
```bash
# Test web app build
cd apps/v-secure/web
VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build

# Test vortex-secure build
cd apps/v-secure/vortex-secure
VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build
```

### 2. Check Build Logs
After deployment, verify in Vercel build logs:
- ✅ `VC_MICROFRONTENDS_CONFIG` is set
- ✅ Build command executes successfully
- ✅ No "microfrontends.json not found" errors
- ✅ Output directory contains built files

### 3. Runtime Verification
- ✅ Main app loads at root URL
- ✅ Dashboard routes (`/dashboard/*`) load from vortex-secure
- ✅ No console errors about missing microfrontends config

## Troubleshooting

### Issue: "microfrontends.json not found"
**Solution**: 
1. Ensure the file exists at `apps/v-secure/microfrontends.json`
2. Verify the path in build command matches the actual file location
3. Check that `rootDirectory` in Vercel matches the project structure

### Issue: Build fails with "Cannot find module"
**Solution**:
1. Ensure `bun install` runs before build
2. Check that all dependencies are in `package.json`
3. Verify `node_modules` is not in `.gitignore` (or ensure install runs)

### Issue: Routing not working
**Solution**:
1. Verify `microfrontends.json` routing configuration
2. Check that both apps are deployed
3. Ensure fallback URLs in config are correct

### Issue: Package manager mismatch
**Solution**:
1. Ensure all `vercel.json` files specify `bun@1.3.4`
2. Remove any `package-lock.json` files (use `bun.lock` only)
3. Set `packageManager` field in `package.json` if needed

## Environment Variables

### Required in Vercel Dashboard

For **web** app:
```
VC_MICROFRONTENDS_CONFIG=../microfrontends.json
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
```

For **vortex-secure** app:
```
VC_MICROFRONTENDS_CONFIG=../microfrontends.json
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
REDACTED_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
```

## Next Steps

1. ✅ All `vercel.json` files updated
2. ⏳ Test local builds
3. ⏳ Deploy to Vercel
4. ⏳ Verify routing works
5. ⏳ Test microfrontends integration

## Additional Resources

- [Vercel Microfrontends Docs](https://vercel.com/docs/frameworks/microfrontends)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
