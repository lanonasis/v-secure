#!/bin/bash

# Publish packages to BOTH npm and GitHub Packages
# Run this from the v-secure root directory

set -e

echo "🚀 Dual Publishing: npm + GitHub Packages"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check npm auth
echo -e "${BLUE}Checking npm authentication...${NC}"
if ! npm whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to npm. Run: npm login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm whoami)${NC}"

# Check GitHub Packages auth (optional)
echo -e "${BLUE}Note: For GitHub Packages, ensure you have a GitHub token in ~/.npmrc${NC}"
echo "  //npm.pkg.github.com/:_authToken=ghp_xxxx"
echo ""

# Function to publish to both registries
dual_publish() {
    local package_dir=$1
    local package_name=$2

    echo -e "${BLUE}📦 Publishing ${package_name}...${NC}"
    cd "$package_dir"

    local version=$(node -p "require('./package.json').version")
    echo -e "${BLUE}   Version: ${version}${NC}"

    # Build
    echo -e "${BLUE}   Building...${NC}"
    npm run build

    # Publish to npm (public registry)
    echo -e "${BLUE}   Publishing to npm...${NC}"
    if npm publish --access public --registry https://registry.npmjs.org; then
        echo -e "${GREEN}   ✅ Published to npm${NC}"
    else
        echo -e "${RED}   ❌ npm publish failed${NC}"
        return 1
    fi

    # Publish to GitHub Packages (requires PAT with write:packages in ~/.npmrc)
    echo -e "${BLUE}   Publishing to GitHub Packages...${NC}"
    if npm publish --registry https://npm.pkg.github.com; then
        echo -e "${GREEN}   ✅ Published to GitHub Packages${NC}"
    else
        echo -e "${RED}   ⚠️  GitHub Packages publish failed (may need auth)${NC}"
        echo -e "${BLUE}   Continuing...${NC}"
    fi

    echo ""
}

# Get the absolute path to v-secure directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$SCRIPT_DIR"

# Publish all packages
dual_publish "$ROOT_DIR/oauth-client" "@lanonasis/oauth-client"
cd "$ROOT_DIR"

dual_publish "$ROOT_DIR/security-sdk" "@lanonasis/security-sdk"
cd "$ROOT_DIR"

dual_publish "$ROOT_DIR/privacy-sdk" "@lanonasis/privacy-sdk"
cd "$ROOT_DIR"

echo -e "${GREEN}🎉 Dual publishing complete!${NC}"
echo ""
echo "Packages are now available on:"
echo "  📦 npm: https://www.npmjs.com/package/<package-name>"
echo "  📦 GitHub: https://github.com/lanonasis?tab=packages"
