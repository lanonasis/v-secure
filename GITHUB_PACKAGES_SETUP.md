# GitHub Packages Publishing Setup - Complete

**Repository**: [lanonasis/v-secure](https://github.com/lanonasis/v-secure)

**Packages**:
- `@lanonasis/oauth-client`
- `@lanonasis/security-sdk`

**Registries**: npm + GitHub Packages (dual publishing)

---

## ✅ Setup Complete

The following has been configured for publishing to both npm and GitHub Packages:

### 1. Package Configuration ✅

Both packages now have proper repository URLs and dual registry support:

**oauth-client/package.json**:
```json
{
  "name": "@lanonasis/oauth-client",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/lanonasis/v-secure.git",
    "directory": "oauth-client"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**security-sdk/package.json**:
```json
{
  "name": "@lanonasis/security-sdk",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/lanonasis/v-secure.git",
    "directory": "security-sdk"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### 2. GitHub Actions Workflow ✅

**File**: `.github/workflows/publish-packages.yml`

**Features**:
- ✅ Automated publishing on git tag push
- ✅ Manual workflow dispatch with UI
- ✅ Dual publishing (npm + GitHub Packages)
- ✅ Automatic GitHub Release creation
- ✅ Version management
- ✅ Build verification

**Triggers**:
- Git tags: `oauth-client-v*` or `security-sdk-v*`
- Manual dispatch from GitHub Actions UI

### 3. Authentication Templates ✅

**File**: `.npmrc.template`

Template for local publishing with both npm and GitHub Packages authentication.

### 4. Publishing Script ✅

**File**: `scripts/publish-dual.sh`

Automated script for manual dual publishing:
```bash
./scripts/publish-dual.sh oauth-client 1.0.1
./scripts/publish-dual.sh security-sdk 1.0.2
```

### 5. Documentation ✅

**File**: `PUBLISHING.md`

Complete 300+ line guide covering:
- Prerequisites and setup
- Automated publishing (recommended)
- Manual publishing (fallback)
- Troubleshooting
- Best practices
- Security guidelines

---

## 🚀 Quick Start - Publish Your First Package

### Option 1: Automated (Recommended)

**Method A: Using Git Tags**

```bash
# 1. Commit your changes
git add .
git commit -m "chore: prepare for release"

# 2. Create and push tag
git tag oauth-client-v1.0.1
git push origin oauth-client-v1.0.1

# GitHub Actions will automatically:
# ✅ Build the package
# ✅ Publish to npm
# ✅ Publish to GitHub Packages
# ✅ Create GitHub Release
```

**Method B: Using GitHub UI**

1. Go to: https://github.com/lanonasis/v-secure/actions/workflows/publish-packages.yml
2. Click **"Run workflow"**
3. Select:
   - Package: `oauth-client` or `security-sdk`
   - Version: `1.0.1`
   - Registry: `both`
4. Click **"Run workflow"**

### Option 2: Manual (Fallback)

```bash
# 1. Ensure tokens are configured
cp .npmrc.template .npmrc
# Edit .npmrc with your tokens

# 2. Run dual publish script
./scripts/publish-dual.sh oauth-client 1.0.1

# Script will:
# ✅ Build package
# ✅ Publish to npm
# ✅ Publish to GitHub Packages
# ✅ Show installation instructions
```

---

## 📋 Prerequisites for Publishing

### 1. GitHub Secrets (Required for Automated Publishing)

Go to: https://github.com/lanonasis/v-secure/settings/secrets/actions

**Add these secrets**:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NPM_TOKEN` | npm automation token | [npmjs.com/settings/YOUR_USERNAME/tokens](https://www.npmjs.com/settings/YOUR_USERNAME/tokens) |
| `GITHUB_TOKEN` | GitHub PAT | Automatically provided by GitHub Actions |

**NPM Token Setup**:
1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token" → "Classic Token"
3. Select "Automation" type
4. Copy token and add to GitHub Secrets as `NPM_TOKEN`

### 2. Local Setup (Required for Manual Publishing)

**Create `.npmrc` file**:
```bash
cp .npmrc.template .npmrc
```

**Edit `.npmrc` with your tokens**:
```ini
# For npm
//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN_HERE

# For GitHub Packages
@lanonasis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT_HERE
```

⚠️ **Security**: Never commit `.npmrc` - it's already in `.gitignore`

**Get GitHub Personal Access Token**:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Classic"
3. Select scopes: `packages:write`, `repo`
4. Copy token and add to `.npmrc`

---

## 🎯 Publishing Workflows

### Workflow 1: Regular Release (Automated)

**Best for**: Production releases

```bash
# 1. Update code and commit
git add .
git commit -m "feat: add new feature"
git push

# 2. Update CHANGELOG.md
# Document changes in CHANGELOG.md

# 3. Create version tag
git tag oauth-client-v1.0.1
git push origin oauth-client-v1.0.1

# 4. GitHub Actions handles the rest!
# Monitor at: https://github.com/lanonasis/v-secure/actions
```

**Result**:
- ✅ Published to npm: `npm install @lanonasis/oauth-client@1.0.1`
- ✅ Published to GitHub Packages
- ✅ GitHub Release created automatically
- ✅ Changelog included in release notes

---

### Workflow 2: Manual Testing Release

**Best for**: Testing before production, hotfixes

```bash
# 1. Navigate to repository
cd /Users/seyederick/DevOps/_project_folders/v-secure

# 2. Run dual publish script
./scripts/publish-dual.sh oauth-client 1.0.1-beta.1

# 3. Test installation
npm install @lanonasis/oauth-client@1.0.1-beta.1

# 4. If successful, create tag for production
git tag oauth-client-v1.0.1
git push origin oauth-client-v1.0.1
```

---

### Workflow 3: GitHub UI Release

**Best for**: Non-technical team members, quick releases

1. Go to: https://github.com/lanonasis/v-secure/actions/workflows/publish-packages.yml

2. Click **"Run workflow"** dropdown

3. Fill in form:
   - **Branch**: `main`
   - **Package**: Select `oauth-client` or `security-sdk`
   - **Version**: Enter version (e.g., `1.0.2`)
   - **Registry**: Select `both` (recommended)

4. Click green **"Run workflow"** button

5. Monitor progress in Actions tab

---

## 🔍 Verification After Publishing

### Verify npm Publication

```bash
# View package info
npm view @lanonasis/oauth-client

# View specific version
npm view @lanonasis/oauth-client@1.0.1

# Install and test
npm install @lanonasis/oauth-client@1.0.1
```

### Verify GitHub Packages Publication

```bash
# View package
npm view @lanonasis/oauth-client --registry=https://npm.pkg.github.com

# Install from GitHub Packages
npm install @lanonasis/oauth-client@1.0.1 --registry=https://npm.pkg.github.com
```

### Check Package Pages

- **npm**: https://www.npmjs.com/package/@lanonasis/oauth-client
- **npm**: https://www.npmjs.com/package/@lanonasis/security-sdk
- **GitHub**: https://github.com/lanonasis/v-secure/packages
- **Releases**: https://github.com/lanonasis/v-secure/releases

---

## 📦 Package URLs

### OAuth Client

- **npm**: https://www.npmjs.com/package/@lanonasis/oauth-client
- **GitHub**: https://github.com/lanonasis/v-secure/tree/main/oauth-client
- **Install**: `npm install @lanonasis/oauth-client`

### Security SDK

- **npm**: https://www.npmjs.com/package/@lanonasis/security-sdk
- **GitHub**: https://github.com/lanonasis/v-secure/tree/main/security-sdk
- **Install**: `npm install @lanonasis/security-sdk`

---

## 🛠️ Maintenance

### Updating Package Versions

```bash
# Patch (bug fixes): 1.0.0 → 1.0.1
npm version patch

# Minor (new features): 1.0.0 → 1.1.0
npm version minor

# Major (breaking changes): 1.0.0 → 2.0.0
npm version major
```

### Unpublishing (Emergency Only)

⚠️ **Warning**: Only use for security issues or critical bugs within 72 hours

```bash
# Unpublish specific version from npm
npm unpublish @lanonasis/oauth-client@1.0.1

# Cannot unpublish from GitHub Packages (contact GitHub support)
```

### Deprecating Versions

```bash
# Mark version as deprecated on npm
npm deprecate @lanonasis/oauth-client@1.0.0 "Security vulnerability, upgrade to 1.0.1"
```

---

## 📚 Additional Resources

### Documentation Files

- **[PUBLISHING.md](./PUBLISHING.md)**: Complete 300+ line publishing guide
- **[.npmrc.template](./.npmrc.template)**: Authentication template
- **[scripts/publish-dual.sh](./scripts/publish-dual.sh)**: Dual publish script
- **[.github/workflows/publish-packages.yml](./.github/workflows/publish-packages.yml)**: CI/CD workflow

### External Links

- **npm Registry**: https://registry.npmjs.org/
- **GitHub Packages**: https://npm.pkg.github.com
- **npm Account**: https://www.npmjs.com/settings/YOUR_USERNAME
- **GitHub Tokens**: https://github.com/settings/tokens
- **Semantic Versioning**: https://semver.org/

---

## 🔐 Security Best Practices

1. **Never commit tokens**:
   - `.npmrc` is in `.gitignore` ✅
   - Use GitHub Secrets for automation ✅
   - Rotate tokens every 30-90 days

2. **Token permissions**:
   - npm: Use "Automation" tokens (not "Publish")
   - GitHub: Only `packages:write` and `repo` scopes

3. **Version control**:
   - Always create git tags for releases
   - Never delete published versions
   - Use deprecation instead of unpublishing

4. **Testing**:
   - Test locally before publishing
   - Use beta versions for testing: `1.0.0-beta.1`
   - Verify installation works after publishing

---

## ❓ Troubleshooting

### "Not authenticated to npm"

```bash
# Solution 1: Login
npm login

# Solution 2: Check .npmrc
cat .npmrc  # Should contain your token

# Solution 3: Verify token
npm whoami
```

### "GitHub Packages authentication failed"

```bash
# Verify token has correct scopes
# Regenerate at: https://github.com/settings/tokens

# Update .npmrc with new token
echo "//npm.pkg.github.com/:_authToken=NEW_TOKEN" >> .npmrc
```

### "Version already published"

```bash
# Bump version
npm version patch

# Or manually edit package.json
```

### "Workflow failed"

1. Check GitHub Actions logs: https://github.com/lanonasis/v-secure/actions
2. Verify GitHub Secrets are set correctly
3. Check package builds locally: `npm run build`
4. Re-run workflow from GitHub UI

---

## 📞 Support

- **Issues**: https://github.com/lanonasis/v-secure/issues
- **Email**: support@lanonasis.com
- **Discord**: https://discord.gg/lanonasis

---

## ✅ Checklist for First Publish

Before your first publish, complete these steps:

- [ ] **GitHub Secrets configured** (NPM_TOKEN)
- [ ] **Local .npmrc created** (from template)
- [ ] **npm account verified** (`npm whoami` works)
- [ ] **GitHub PAT created** (with packages:write scope)
- [ ] **Packages build successfully** (`npm run build` in each)
- [ ] **Tests pass** (`npm test` in each)
- [ ] **README.md files updated** ✅ (Already done)
- [ ] **CHANGELOG.md created** (optional, recommended)
- [ ] **Choose publishing method**:
  - [ ] Automated (git tags) - Recommended
  - [ ] Manual (publish script)
  - [ ] GitHub UI workflow

---

**Setup Date**: January 25, 2025
**Status**: ✅ Ready to Publish
**Next Step**: Choose a publishing method and publish your first version!

---

## 🎉 Summary

You now have a **complete dual-publishing setup** for `@lanonasis/oauth-client` and `@lanonasis/security-sdk`:

✅ **Automated**: GitHub Actions handles publishing on git tag push
✅ **Flexible**: Manual script for local testing and hotfixes
✅ **Dual Registry**: Both npm and GitHub Packages
✅ **Documented**: Complete 300+ line guide with examples
✅ **Secure**: Authentication templates and best practices
✅ **Professional**: README files updated for users

**Start publishing**: Choose a workflow above and publish your first version! 🚀
