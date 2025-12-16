#!/bin/bash

# Publish all v-secure packages to npm
# Run this script from the v-secure root directory

set -e  # Exit on error

echo "🚀 Publishing v-secure packages to npm..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if logged in to npm
echo -e "${BLUE}Checking npm authentication...${NC}"
if ! npm whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to npm. Please run: npm login${NC}"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✅ Logged in as: ${NPM_USER}${NC}"
echo ""

# Function to publish a package
publish_package() {
    local package_dir=$1
    local package_name=$2

    echo -e "${BLUE}📦 Publishing ${package_name}...${NC}"

    cd "$package_dir"

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found in ${package_dir}${NC}"
        return 1
    fi

    # Get package version
    local version=$(node -p "require('./package.json').version")
    echo -e "${BLUE}   Version: ${version}${NC}"

    # Build the package
    echo -e "${BLUE}   Building...${NC}"
    if npm run build; then
        echo -e "${GREEN}   ✅ Build successful${NC}"
    else
        echo -e "${RED}   ❌ Build failed${NC}"
        return 1
    fi

    # Publish to npm
    echo -e "${BLUE}   Publishing to npm...${NC}"
    if npm publish --access public; then
        echo -e "${GREEN}   ✅ Published ${package_name}@${version} successfully!${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}   ❌ Publish failed for ${package_name}${NC}"
        return 1
    fi
}

# Get the absolute path to v-secure directory (where this script is located)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$SCRIPT_DIR"

# Track success/failure
PUBLISHED=()
FAILED=()

# Publish oauth-client
if publish_package "$ROOT_DIR/oauth-client" "@lanonasis/oauth-client"; then
    PUBLISHED+=("@lanonasis/oauth-client")
else
    FAILED+=("@lanonasis/oauth-client")
fi
cd "$ROOT_DIR"

# Publish security-sdk
if publish_package "$ROOT_DIR/security-sdk" "@lanonasis/security-sdk"; then
    PUBLISHED+=("@lanonasis/security-sdk")
else
    FAILED+=("@lanonasis/security-sdk")
fi
cd "$ROOT_DIR"

# Publish privacy-sdk
if publish_package "$ROOT_DIR/privacy-sdk" "@lanonasis/privacy-sdk"; then
    PUBLISHED+=("@lanonasis/privacy-sdk")
else
    FAILED+=("@lanonasis/privacy-sdk")
fi
cd "$ROOT_DIR"

# Summary
echo ""
echo "======================================"
echo "📊 PUBLICATION SUMMARY"
echo "======================================"

if [ ${#PUBLISHED[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Successfully published (${#PUBLISHED[@]}):${NC}"
    for pkg in "${PUBLISHED[@]}"; do
        echo -e "   ${GREEN}✓${NC} $pkg"
    done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed to publish (${#FAILED[@]}):${NC}"
    for pkg in "${FAILED[@]}"; do
        echo -e "   ${RED}✗${NC} $pkg"
    done
    echo ""
    echo -e "${YELLOW}⚠️  Some packages failed to publish. Check errors above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All packages published successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify packages on npm:"
for pkg in "${PUBLISHED[@]}"; do
    echo "   npm view $pkg"
done
echo ""
echo "2. Test installation in a new project:"
echo "   npm install ${PUBLISHED[@]}"
