# Publishing Guide

Complete guide for publishing `@lanonasis/oauth-client` and `@lanonasis/security-sdk` to npm and GitHub Packages.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup](#setup)
3. [Publishing Methods](#publishing-methods)
4. [Automated Publishing (Recommended)](#automated-publishing-recommended)
5. [Manual Publishing](#manual-publishing)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Prerequisites

### Required Accounts & Access

1. **npm Account**
   - Create account at [npmjs.com](https://www.npmjs.com/signup)
   - Join `@lanonasis` organization (request access from admin)
   - Generate access token: [npmjs.com/settings/YOUR_USERNAME/tokens](https://www.npmjs.com/settings/YOUR_USERNAME/tokens)
   - Token scope: **Automation** (for CI/CD)

2. **GitHub Account**
   - Access to `lanonasis/v-secure` repository
   - Write access to GitHub Packages
   - Personal Access Token (PAT): [github.com/settings/tokens](https://github.com/settings/tokens)
   - Token scopes: `packages:write`, `repo`

3. **Local Environment**
   - Node.js 18+ installed
   - npm 9+ or bun
   - Git configured

---

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/lanonasis/v-secure.git
cd v-secure
```

### 2. Configure Authentication

#### Option A: Using .npmrc (Local Publishing)

```bash
# Copy template
cp .npmrc.template .npmrc

# Edit .npmrc and replace tokens
# For npm:
//registry.npmjs.org/:_authToken=YOUR_NPM_TOKEN

# For GitHub Packages:
@lanonasis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

⚠️ **Security**: Never commit `.npmrc` with tokens!

```bash
# Add to .gitignore (already included)
echo ".npmrc" >> .gitignore
```

#### Option B: Using Environment Variables (CI/CD)

```bash
# For npm
export NPM_TOKEN="your_npm_token"

# For GitHub Packages
export GITHUB_TOKEN="your_github_pat"
```

### 3. Configure GitHub Secrets (For Automated Publishing)

Go to: `https://github.com/lanonasis/v-secure/settings/secrets/actions`

Add these secrets:
- **`NPM_TOKEN`**: Your npm automation token
- **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions (no manual setup)

---

## Publishing Methods

### Comparison

| Method | Use Case | Effort | Automation |
|--------|----------|--------|------------|
| **Automated (GitHub Actions)** | Production releases | Low | ✅ Full |
| **Manual (Local)** | Testing, hotfixes | Medium | ❌ None |

---

## Automated Publishing (Recommended)

### Method 1: Git Tag (Automatic)

**Best for**: Version releases following semantic versioning

```bash
# 1. Commit your changes
git add .
git commit -m "feat: add new feature"

# 2. Create version tag
# For oauth-client
git tag oauth-client-v1.0.1
git push origin oauth-client-v1.0.1

# For security-sdk
git tag security-sdk-v1.0.2
git push origin security-sdk-v1.0.2
```

**What happens**:
1. Tag push triggers GitHub Actions workflow
2. Builds package automatically
3. Publishes to **both** npm and GitHub Packages
4. Creates GitHub Release with changelog

**Tag format**:
- OAuth Client: `oauth-client-vX.Y.Z`
- Security SDK: `security-sdk-vX.Y.Z`

---

### Method 2: Manual Workflow Dispatch

**Best for**: Publishing without creating tags, testing workflows

1. Go to GitHub Actions: `https://github.com/lanonasis/v-secure/actions/workflows/publish-packages.yml`

2. Click **"Run workflow"**

3. Select options:
   - **Package**: Choose `oauth-client` or `security-sdk`
   - **Version**: Enter version (e.g., `1.0.3`)
   - **Registry**: Choose:
     - `npm` - Publish only to npm
     - `github` - Publish only to GitHub Packages
     - `both` - Publish to both (recommended)

4. Click **"Run workflow"**

**Workflow Steps**:
```
1. Checkout code
2. Install dependencies
3. Build package
4. Update version in package.json
5. Publish to npm (if selected)
6. Publish to GitHub Packages (if selected)
7. Create GitHub Release (if triggered by tag)
```

---

## Manual Publishing

### Prerequisites Check

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm authentication
npm whoami  # Should show your npm username

# Check package builds
cd oauth-client && npm run build && cd ..
cd security-sdk && npm run build && cd ..
```

---

### Publishing to npm (Manual)

#### OAuth Client

```bash
cd oauth-client

# 1. Install dependencies
npm install

# 2. Build package
npm run build

# 3. Test package (optional)
npm test

# 4. Update version (semantic versioning)
npm version patch  # 1.0.0 → 1.0.1
# OR
npm version minor  # 1.0.0 → 1.1.0
# OR
npm version major  # 1.0.0 → 2.0.0

# 5. Publish to npm
npm publish --access public

# 6. Verify publication
npm view @lanonasis/oauth-client
```

#### Security SDK

```bash
cd security-sdk

# 1. Install dependencies
npm install

# 2. Build package
npm run build

# 3. Test package (optional)
npm test

# 4. Update version
npm version patch  # Or minor/major

# 5. Publish to npm
npm publish --access public

# 6. Verify publication
npm view @lanonasis/security-sdk
```

---

### Publishing to GitHub Packages (Manual)

#### Configure Registry for GitHub Packages

```bash
# Option 1: Update .npmrc temporarily
echo "@lanonasis:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# Option 2: Use npm config
npm config set @lanonasis:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken $GITHUB_TOKEN
```

#### Publish OAuth Client

```bash
cd oauth-client

# 1. Update package.json for GitHub Packages
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.publishConfig = {
  registry: 'https://npm.pkg.github.com',
  access: 'public'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 2. Build
npm run build

# 3. Publish
npm publish

# 4. Restore package.json for npm registry
git checkout package.json

# 5. Verify
npm view @lanonasis/oauth-client --registry=https://npm.pkg.github.com
```

#### Publish Security SDK

```bash
cd security-sdk

# Same steps as oauth-client
node -e "..." # Update package.json
npm run build
npm publish
git checkout package.json
```

---

### Publishing to Both Registries (Manual)

**Script**: Use the provided script for convenience

```bash
# Make script executable
chmod +x scripts/publish-dual.sh

# Publish oauth-client to both registries
./scripts/publish-dual.sh oauth-client 1.0.1

# Publish security-sdk to both registries
./scripts/publish-dual.sh security-sdk 1.0.2
```

**Script content** (`scripts/publish-dual.sh`):

```bash
#!/bin/bash
# Dual publish script (npm + GitHub Packages)

PACKAGE=$1
VERSION=$2

if [ -z "$PACKAGE" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./publish-dual.sh <package-name> <version>"
  echo "Example: ./publish-dual.sh oauth-client 1.0.1"
  exit 1
fi

echo "📦 Publishing $PACKAGE v$VERSION to both npm and GitHub Packages..."

cd "$PACKAGE" || exit 1

# Build
echo "🔨 Building..."
npm run build

# Update version
echo "📝 Updating version to $VERSION..."
npm version "$VERSION" --no-git-tag-version

# Publish to npm
echo "📤 Publishing to npm..."
npm publish --access public --registry https://registry.npmjs.org/

# Update for GitHub Packages
echo "🔧 Configuring for GitHub Packages..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.publishConfig = {
  registry: 'https://npm.pkg.github.com',
  access: 'public'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Publish to GitHub Packages
echo "📤 Publishing to GitHub Packages..."
npm publish --registry https://npm.pkg.github.com/

# Restore package.json
git checkout package.json

echo "✅ Successfully published $PACKAGE v$VERSION to both registries!"
```

---

## Troubleshooting

### Common Issues

#### 1. "You do not have permission to publish"

**Problem**: Not part of `@lanonasis` organization on npm

**Solution**:
```bash
# Request access from organization admin
# Or verify you're logged in
npm login
npm whoami
```

#### 2. "402 Payment Required"

**Problem**: Private packages require paid npm account

**Solution**: Ensure `publishConfig.access` is set to `"public"` in package.json

#### 3. "Version X.Y.Z already exists"

**Problem**: Trying to republish same version

**Solution**:
```bash
# Bump version
npm version patch  # Or minor/major

# Or manually edit package.json and change version
```

#### 4. "ENEEDAUTH"

**Problem**: Not authenticated to npm registry

**Solution**:
```bash
# Check authentication
npm whoami

# If not logged in
npm login

# Or set token
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" >> .npmrc
```

#### 5. "GitHub Packages authentication failed"

**Problem**: GitHub token missing or insufficient permissions

**Solution**:
```bash
# Check token has packages:write scope
# Regenerate token: https://github.com/settings/tokens

# Set token
export GITHUB_TOKEN="your_new_token"
```

#### 6. "Package build failed"

**Problem**: Build errors or missing dependencies

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build

# Fix errors and try again
```

---

## Best Practices

### Versioning

Follow [Semantic Versioning (SemVer)](https://semver.org/):

- **Major** (X.0.0): Breaking changes
  ```bash
  npm version major  # 1.2.3 → 2.0.0
  ```

- **Minor** (x.Y.0): New features (backward compatible)
  ```bash
  npm version minor  # 1.2.3 → 1.3.0
  ```

- **Patch** (x.y.Z): Bug fixes
  ```bash
  npm version patch  # 1.2.3 → 1.2.4
  ```

### Changelog

Update `CHANGELOG.md` before each release:

```markdown
## [1.0.1] - 2025-01-25

### Added
- New feature X

### Fixed
- Bug in Y

### Changed
- Updated Z
```

### Testing Before Publish

```bash
# 1. Build and test locally
npm run build
npm test

# 2. Test in another project
npm pack  # Creates tarball
# In test project:
npm install /path/to/lanonasis-oauth-client-1.0.1.tgz

# 3. Verify exports work
node -e "const pkg = require('@lanonasis/oauth-client'); console.log(pkg);"
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feat/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feat/new-feature

# 4. After PR merge, tag release
git checkout main
git pull
git tag oauth-client-v1.0.1
git push origin oauth-client-v1.0.1
```

### Security

1. **Never commit tokens**:
   ```bash
   # Add to .gitignore
   .npmrc
   .env
   .env.local
   ```

2. **Use short-lived tokens** (30 days max)

3. **Rotate tokens regularly**:
   ```bash
   # Revoke old tokens
   # Generate new tokens
   # Update GitHub secrets
   ```

4. **Audit published packages**:
   ```bash
   npm audit
   ```

---

## Publishing Checklist

### Pre-Publish

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] README.md updated (if needed)
- [ ] Breaking changes documented
- [ ] Dependencies updated
- [ ] Security audit clean (`npm audit`)

### Publish

- [ ] Published to npm
- [ ] Published to GitHub Packages
- [ ] Git tag created
- [ ] GitHub Release created

### Post-Publish

- [ ] Verify npm package: `npm view @lanonasis/PACKAGE`
- [ ] Verify GitHub Package: `npm view @lanonasis/PACKAGE --registry=https://npm.pkg.github.com`
- [ ] Test installation: `npm install @lanonasis/PACKAGE@latest`
- [ ] Update dependent projects
- [ ] Announce release (Discord/Slack/etc.)

---

## Quick Reference

### Commands

```bash
# Check authentication
npm whoami

# Build packages
npm run build

# Test packages
npm test

# Version bump
npm version patch|minor|major

# Publish to npm
npm publish --access public

# Publish to GitHub Packages
npm publish --registry https://npm.pkg.github.com

# View package info
npm view @lanonasis/PACKAGE

# Install specific version
npm install @lanonasis/PACKAGE@1.0.1
```

### URLs

- **npm Registry**: https://registry.npmjs.org/
- **GitHub Packages**: https://npm.pkg.github.com
- **npm Account**: https://www.npmjs.com/settings/YOUR_USERNAME
- **GitHub Tokens**: https://github.com/settings/tokens
- **Repository**: https://github.com/lanonasis/v-secure
- **Actions**: https://github.com/lanonasis/v-secure/actions

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/lanonasis/v-secure/issues
- **Email**: support@lanonasis.com
- **Discord**: https://discord.gg/lanonasis

---

**Last Updated**: 2025-01-25
**Maintainer**: Seye Derick
