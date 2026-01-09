# Vercel Microfrontends Solution

## Problem Summary

You have two applications that need to be deployed to the same subdomain with path-based routing:

- **v-secure** (Next.js) - Main landing page and auth flows
- **vortex-secure** (Vite) - Dashboard application on `/dashboard/*` routes

The issue is that Vercel's microfrontends configuration requires proper setup of the `microfrontends.json` file and correct project settings.

## Solution Overview

### 1. Microfrontends Configuration Location

**File**: `apps/v-secure/microfrontends.json`
**Purpose**: Defines how microfrontends are routed and configured

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "v-secure": {
      "packageName": "@lanonasis/vortexshield-web",
      "development": {
        "local": 3000,
        "fallback": "https://v-secure.vercel.app"
      }
    },
    "vortex-secure": {
      "development": {
        "local": 5173,
        "fallback": "https://vortex-secure.vercel.app"
      },
      "routing": [
        {
          "paths": [
            "/dashboard/:path*"
          ]
        }
      ]
    }
  }
}
```

### 2. Deployment Architecture

#### Single Subdomain with Path Routing
```
v-secure.vercel.app/
├── /                    → v-secure (Next.js)
├── /login              → v-secure (Next.js)
├── /signup             → v-secure (Next.js)
└── /dashboard/*        → vortex-secure (Vite)
    ├── /dashboard      → vortex-secure main page
    ├── /dashboard/secrets → vortex-secure secrets page
    └── /dashboard/*     → vortex-secure catch-all
```

#### Vercel Project Setup (Recommended: Separate Projects)

**Project 1: v-secure (Main)**
- **Name**: `v-secure`
- **Connect from**: `apps/v-secure/web` directory
- **Framework**: Next.js (auto-detected)
- **Root Directory**: Set to empty (current directory) in Vercel dashboard
- **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`

**Project 2: vortex-secure (Dashboard)**
- **Name**: `vortex-secure`
- **Connect from**: `apps/v-secure/vortex-secure` directory
- **Framework**: Vite (auto-detected)
- **Root Directory**: Set to empty (current directory) in Vercel dashboard
- **Build Command**: `VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run build`

#### Alternative: Monorepo Deployment (Not Recommended for Microfrontends)

If deploying from monorepo root, set **Root Directory** in Vercel dashboard:
- **v-secure project**: Root Directory = `apps/v-secure/web`
- **vortex-secure project**: Root Directory = `apps/v-secure/vortex-secure`

### 3. Current Issue Resolution

#### Vortex-Secure Root Directory Fix

The error `The provided path "~/dev-hub/lan-onasis-monorepo/apps/v-secure/vortex-secure/vortex-secure" does not exist` indicates that the Vercel project has the wrong root directory setting.

**Solution**: Update the root directory in Vercel dashboard:

1. Go to: https://vercel.com/onasis-team/vortex-secure/settings
2. Navigate to **General** → **Root Directory**
3. **Set to**: `apps/v-secure/vortex-secure` (leave empty if deploying from that directory)
4. **Save changes**
5. **Trigger a new deployment**

#### Alternative: Redeploy with Override

```bash
cd apps/v-secure/vortex-secure
VC_MICROFRONTENDS_CONFIG=../microfrontends.json vercel --prod --force
```

### 4. How Microfrontends Routing Works

#### Build-Time Configuration
- `VC_MICROFRONTENDS_CONFIG=../microfrontends.json` tells each app about the routing configuration
- `@vercel/microfrontends/next/config` wraps Next.js config for the main app
- `@vercel/microfrontends/experimental/vite` configures Vite for the child app

#### Runtime Routing
- **Main app** (v-secure) handles all routes except `/dashboard/*`
- **Child app** (vortex-secure) handles `/dashboard/*` routes
- Routing is handled by Vercel's edge network, not client-side routing

#### Local Development (Updated for Official Microfrontends)
```bash
# From monorepo root - runs both apps with automatic port assignment
bun run dev:v-secure

# Or run individual apps:
cd apps/v-secure/web
VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run dev

cd apps/v-secure/vortex-secure
VC_MICROFRONTENDS_CONFIG=../microfrontends.json bun run dev
```

**New Features:**
- ✅ Automatic port assignment (`npx @vercel/microfrontends port <app-name>`)
- ✅ Turbo integration for running multiple apps
- ✅ No more hardcoded ports in configuration

### 5. Configuration Files Setup

#### Main App (v-secure/web)
- `next.config.js`: Uses `withMicrofrontends()` wrapper
- `vercel.json`: Build command includes microfrontends config
- `package.json`: Scripts reference `VC_MICROFRONTENDS_CONFIG`

#### Child App (vortex-secure)
- `vite.config.ts`: Uses `microfrontends()` plugin
- `vercel.json`: Build command includes microfrontends config
- `package.json`: Scripts reference `VC_MICROFRONTENDS_CONFIG`

#### Shared Configuration
- `microfrontends.json`: Root-level routing configuration
- Must be accessible from both app directories (`../microfrontends.json`)

### 6. Deployment Steps

#### Step 1: Fix Vortex-Secure Root Directory
1. Open https://vercel.com/onasis-team/vortex-secure/settings
2. Go to **General** → **Root Directory**
3. Set to: `apps/v-secure/vortex-secure` (or empty)
4. Save

#### Step 2: Ensure Microfrontends Config
```bash
# From apps/v-secure directory
ls -la microfrontends.json  # Should exist
```

#### Step 3: Deploy from Correct Directories

**Recommended: Deploy from App Directories**
```bash
# Deploy main app from its directory
cd apps/v-secure/web
VC_MICROFRONTENDS_CONFIG=../microfrontends.json vercel --prod

# Deploy dashboard app from its directory (after fixing root directory)
cd apps/v-secure/vortex-secure
VC_MICROFRONTENDS_CONFIG=../microfrontends.json vercel --prod
```

**Alternative: Deploy from Monorepo Root**
If deploying from monorepo root, ensure **Root Directory** is set in Vercel dashboard:
- For v-secure project: Root Directory = `apps/v-secure/web`
- For vortex-secure project: Root Directory = `apps/v-secure/vortex-secure`

#### Step 4: Verify Routing
- `https://v-secure.vercel.app/` → Main app
- `https://v-secure.vercel.app/dashboard` → Dashboard app
- `https://v-secure.vercel.app/login` → Main app

### 7. Troubleshooting

#### Issue: "microfrontends.json not found"
**Solution**:
- Ensure file exists at `apps/v-secure/microfrontends.json`
- Check build command includes `VC_MICROFRONTENDS_CONFIG=../microfrontends.json`

#### Issue: Wrong root directory
**Solution**:
- Update in Vercel dashboard: Settings → General → Root Directory
- Set to `apps/v-secure/vortex-secure` or empty

#### Issue: Routing not working
**Solution**:
- Verify `microfrontends.json` routing configuration
- Check that both apps are deployed to same team
- Ensure fallback URLs are correct in config

#### Issue: Build fails
**Solution**:
- Check that `@vercel/microfrontends` package is installed
- Verify build commands include environment variable
- Ensure Bun is set as package manager in Vercel

### 8. Expected Behavior After Fix

✅ **Main app loads** at root URL
✅ **Dashboard routes** (`/dashboard/*`) route to vortex-secure
✅ **No routing conflicts** between Next.js and Vite apps
✅ **Both apps build successfully** with microfrontends config
✅ **Development mode** works with local servers

### 9. Environment Variables

Add these to both Vercel projects:

**For v-secure (main app):**
```
VC_MICROFRONTENDS_CONFIG=../microfrontends.json
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

**For vortex-secure (dashboard app):**
```
VC_MICROFRONTENDS_CONFIG=../microfrontends.json
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

### 10. Summary

The microfrontends setup allows you to deploy two different frameworks (Next.js + Vite) to the same subdomain with path-based routing. The key requirements are:

1. **Correct root directory** settings in Vercel dashboard
2. **microfrontends.json** file in the shared parent directory
3. **Build commands** that include the microfrontends config environment variable
4. **Proper package manager** (Bun) configuration

Once these are set correctly, both apps will deploy and route properly.