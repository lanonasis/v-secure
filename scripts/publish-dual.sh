#!/bin/bash
# Dual publish script for publishing packages to both npm and GitHub Packages
# Usage: ./scripts/publish-dual.sh <package-name> <version>
# Example: ./scripts/publish-dual.sh oauth-client 2.0.2

set -e  # Exit on error

# Get script directory for reliable path resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSECURE_ROOT="$(dirname "$SCRIPT_DIR")"

PACKAGE=$1
VERSION=$2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Cleanup function for trap
cleanup() {
  if [ -f "$PACKAGE_DIR/package.json.backup" ]; then
    echo -e "${YELLOW}🔄 Restoring package.json from backup...${NC}"
    mv "$PACKAGE_DIR/package.json.backup" "$PACKAGE_DIR/package.json"
  fi
}

# Set trap to cleanup on exit (including Ctrl+C)
trap cleanup EXIT

# Validate arguments
if [ -z "$PACKAGE" ] || [ -z "$VERSION" ]; then
  echo -e "${RED}❌ Error: Missing arguments${NC}"
  echo ""
  echo "Usage: ./scripts/publish-dual.sh <package-name> <version>"
  echo "Example: ./scripts/publish-dual.sh oauth-client 2.0.2"
  echo ""
  echo "Available packages: oauth-client, security-sdk"
  exit 1
fi

# Validate package name
if [ "$PACKAGE" != "oauth-client" ] && [ "$PACKAGE" != "security-sdk" ]; then
  echo -e "${RED}❌ Error: Invalid package name '${PACKAGE}'${NC}"
  echo "Valid packages: oauth-client, security-sdk"
  exit 1
fi

# Validate version format (X.Y.Z or X.Y.Z-tag)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo -e "${RED}❌ Error: Invalid version format '${VERSION}'${NC}"
  echo "Version must be in format X.Y.Z (e.g., 2.0.2) or X.Y.Z-tag (e.g., 2.0.2-beta.1)"
  exit 1
fi

# Set package directory
PACKAGE_DIR="$VSECURE_ROOT/$PACKAGE"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Dual Registry Publish: @lanonasis/${PACKAGE}${NC}"
echo -e "${BLUE}║   Version: ${VERSION}${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if package directory exists
if [ ! -d "$PACKAGE_DIR" ]; then
  echo -e "${RED}❌ Error: Package directory not found: ${PACKAGE_DIR}${NC}"
  exit 1
fi

if [ ! -f "$PACKAGE_DIR/package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in ${PACKAGE_DIR}${NC}"
  exit 1
fi

cd "$PACKAGE_DIR"

# ============================================================================
# Pre-flight checks
# ============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔐 Pre-flight checks...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check npm authentication
echo -e "  Checking npm authentication..."
NPM_USER=$(npm whoami --registry https://registry.npmjs.org/ 2>/dev/null || echo "")
if [ -z "$NPM_USER" ]; then
  echo -e "${RED}  ❌ Not logged in to npm. Run: npm login${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ npm: logged in as ${NPM_USER}${NC}"

# Check GitHub Packages authentication
echo -e "  Checking GitHub Packages authentication..."
GH_USER=$(npm whoami --registry https://npm.pkg.github.com/ 2>/dev/null || echo "")
if [ -z "$GH_USER" ]; then
  echo -e "${YELLOW}  ⚠ Not logged in to GitHub Packages (will try with token from .npmrc)${NC}"
else
  echo -e "  ${GREEN}✓ GitHub Packages: logged in as ${GH_USER}${NC}"
fi

# Check if version already exists on npm
echo -e "  Checking if version exists on npm..."
EXISTING_NPM=$(npm view @lanonasis/${PACKAGE}@${VERSION} version 2>/dev/null || echo "")
if [ -n "$EXISTING_NPM" ]; then
  echo -e "${RED}  ❌ Version ${VERSION} already published to npm!${NC}"
  echo -e "${YELLOW}     Bump the version and try again.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ Version ${VERSION} is available on npm${NC}"

echo ""

# ============================================================================
# Build
# ============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Use bun if available, fallback to npm
if command -v bun &> /dev/null; then
  bun install
else
  npm install
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔨 Building package...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v bun &> /dev/null; then
  bun run build
else
  npm run build
fi

# Check build output
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Error: Build failed - dist directory not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

echo ""

# ============================================================================
# Version update
# ============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Updating version to ${VERSION}...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Save original package.json BEFORE version update
cp package.json package.json.backup

# Update version
npm version "$VERSION" --no-git-tag-version --allow-same-version
echo -e "${GREEN}✓ Version updated to ${VERSION}${NC}"

echo ""

# ============================================================================
# Publish to npm
# ============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📤 Publishing to npm...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if npm publish --access public --registry https://registry.npmjs.org/; then
  echo -e "${GREEN}✅ Successfully published to npm!${NC}"
  echo -e "   ${BLUE}https://www.npmjs.com/package/@lanonasis/${PACKAGE}${NC}"
else
  echo -e "${RED}❌ Failed to publish to npm${NC}"
  exit 1
fi

echo ""

# ============================================================================
# Publish to GitHub Packages
# ============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📤 Publishing to GitHub Packages...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Temporarily update publishConfig for GitHub Packages
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.publishConfig = {
  registry: 'https://npm.pkg.github.com',
  access: 'public'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

if npm publish --registry https://npm.pkg.github.com/; then
  echo -e "${GREEN}✅ Successfully published to GitHub Packages!${NC}"
  echo -e "   ${BLUE}https://github.com/lanonasis/v-secure/packages${NC}"
else
  echo -e "${YELLOW}⚠ Failed to publish to GitHub Packages (npm publish succeeded)${NC}"
  # Don't exit - npm publish already succeeded
fi

# Restore original package.json (with new version but npm publishConfig)
# The trap will handle this, but we do it explicitly here
mv package.json.backup package.json
# Update version in restored file
npm version "$VERSION" --no-git-tag-version --allow-same-version 2>/dev/null || true

# Clear the trap since we've already cleaned up
trap - EXIT

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ SUCCESS! Published @lanonasis/${PACKAGE}@${VERSION}${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📦 Installation:${NC}"
echo ""
echo "   From npm (recommended):"
echo -e "   ${YELLOW}npm install @lanonasis/${PACKAGE}@${VERSION}${NC}"
echo -e "   ${YELLOW}bun add @lanonasis/${PACKAGE}@${VERSION}${NC}"
echo ""
echo "   From GitHub Packages:"
echo -e "   ${YELLOW}npm install @lanonasis/${PACKAGE}@${VERSION} --registry=https://npm.pkg.github.com${NC}"
echo ""
echo -e "${BLUE}🔗 Package URLs:${NC}"
echo "   npm: https://www.npmjs.com/package/@lanonasis/${PACKAGE}"
echo "   GitHub: https://github.com/lanonasis/v-secure/packages"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   1. Update CHANGELOG.md (if not already done)"
echo "   2. Commit changes: ${YELLOW}git add -A && git commit -m \"chore: release @lanonasis/${PACKAGE}@${VERSION}\"${NC}"
echo "   3. Create git tag: ${YELLOW}git tag ${PACKAGE}-v${VERSION}${NC}"
echo "   4. Push with tags: ${YELLOW}git push && git push --tags${NC}"
echo "   5. Create GitHub Release (optional)"
echo ""
