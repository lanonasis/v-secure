#!/bin/bash
# Dual publish script for publishing packages to both npm and GitHub Packages
# Usage: ./scripts/publish-dual.sh <package-name> <version>
# Example: ./scripts/publish-dual.sh oauth-client 1.0.1

set -e  # Exit on error

PACKAGE=$1
VERSION=$2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$PACKAGE" ] || [ -z "$VERSION" ]; then
  echo -e "${RED}❌ Error: Missing arguments${NC}"
  echo "Usage: ./scripts/publish-dual.sh <package-name> <version>"
  echo "Example: ./scripts/publish-dual.sh oauth-client 1.0.1"
  exit 1
fi

# Validate package name
if [ "$PACKAGE" != "oauth-client" ] && [ "$PACKAGE" != "security-sdk" ]; then
  echo -e "${RED}❌ Error: Invalid package name${NC}"
  echo "Valid packages: oauth-client, security-sdk"
  exit 1
fi

# Validate version format (X.Y.Z)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}❌ Error: Invalid version format${NC}"
  echo "Version must be in format X.Y.Z (e.g., 1.0.1)"
  exit 1
fi

echo -e "${BLUE}📦 Publishing ${PACKAGE} v${VERSION} to both npm and GitHub Packages...${NC}"
echo ""

# Navigate to package directory
cd "$PACKAGE" || exit 1

# Check if package directory exists
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in ${PACKAGE}${NC}"
  exit 1
fi

# Install dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
npm install

# Build package
echo -e "${YELLOW}🔨 Building package...${NC}"
npm run build

# Check build output
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Error: Build failed - dist directory not found${NC}"
  exit 1
fi

# Update version in package.json
echo -e "${YELLOW}📝 Updating version to ${VERSION}...${NC}"
npm version "$VERSION" --no-git-tag-version

# Save original package.json
cp package.json package.json.backup

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📤 Publishing to npm...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Publish to npm
if npm publish --access public --registry https://registry.npmjs.org/; then
  echo -e "${GREEN}✅ Successfully published to npm!${NC}"
  echo "   View at: https://www.npmjs.com/package/@lanonasis/${PACKAGE}"
else
  echo -e "${RED}❌ Failed to publish to npm${NC}"
  # Restore package.json
  mv package.json.backup package.json
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 Configuring for GitHub Packages...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Update package.json for GitHub Packages
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.publishConfig = {
  registry: 'https://npm.pkg.github.com',
  access: 'public'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📤 Publishing to GitHub Packages...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Publish to GitHub Packages
if npm publish --registry https://npm.pkg.github.com/; then
  echo -e "${GREEN}✅ Successfully published to GitHub Packages!${NC}"
  echo "   View at: https://github.com/lanonasis/v-secure/packages"
else
  echo -e "${RED}❌ Failed to publish to GitHub Packages${NC}"
  # Restore package.json
  mv package.json.backup package.json
  exit 1
fi

# Restore original package.json
echo -e "${YELLOW}🔄 Restoring package.json...${NC}"
mv package.json.backup package.json

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SUCCESS! Published ${PACKAGE} v${VERSION} to both registries${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📦 Installation:${NC}"
echo ""
echo "   From npm (default):"
echo -e "   ${YELLOW}npm install @lanonasis/${PACKAGE}@${VERSION}${NC}"
echo ""
echo "   From GitHub Packages:"
echo -e "   ${YELLOW}npm install @lanonasis/${PACKAGE}@${VERSION} --registry=https://npm.pkg.github.com${NC}"
echo ""
echo -e "${BLUE}🔗 Package URLs:${NC}"
echo "   npm: https://www.npmjs.com/package/@lanonasis/${PACKAGE}"
echo "   GitHub: https://github.com/lanonasis/v-secure/packages"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   1. Create git tag: ${YELLOW}git tag ${PACKAGE}-v${VERSION}${NC}"
echo "   2. Push tag: ${YELLOW}git push origin ${PACKAGE}-v${VERSION}${NC}"
echo "   3. Create GitHub Release"
echo "   4. Update CHANGELOG.md"
echo ""
