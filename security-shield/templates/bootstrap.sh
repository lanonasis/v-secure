#!/usr/bin/env bash
# ============================================
# LanOnasis Security Shield — Bootstrap Script
# Source of truth: apps/v-secure/security-shield/templates/
#
# Usage:
#   ./bootstrap.sh <target-dir> [--platform netlify|vercel] [--app-type public|private]
#
# Examples:
#   ./bootstrap.sh ~/projects/my-app                     # Netlify + public
#   ./bootstrap.sh ~/projects/my-app --platform vercel   # Vercel + public
#   ./bootstrap.sh ~/projects/my-app --app-type private  # Netlify + private (dashboard/console)
#
# What it copies:
#   Netlify:  security-shield.ts → netlify/edge-functions/
#             netlify.toml (merged hint), _headers, robots-*.txt, sitemap-template.xml,
#             seo-meta-template.html, security.txt
#   Vercel:   vercel/middleware.ts, vercel/vercel.json, vercel/robots.txt
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET=""
PLATFORM="netlify"
APP_TYPE="public"

# ─── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --platform) PLATFORM="$2"; shift 2 ;;
    --app-type) APP_TYPE="$2"; shift 2 ;;
    -*) echo "Unknown flag: $1"; exit 1 ;;
    *) TARGET="$1"; shift ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <target-dir> [--platform netlify|vercel] [--app-type public|private]"
  exit 1
fi

if [[ ! -d "$TARGET" ]]; then
  echo "Error: target directory does not exist: $TARGET"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " LanOnasis Security Shield Bootstrap"
echo " Target  : $TARGET"
echo " Platform: $PLATFORM"
echo " App type: $APP_TYPE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

copy_file() {
  local src="$1" dst_dir="$2" dst_name="${3:-}"
  mkdir -p "$dst_dir"
  local dst="$dst_dir/${dst_name:-$(basename "$src")}"
  cp "$src" "$dst"
  echo "  ✓ $(basename "$dst")"
}

# ─── Netlify ─────────────────────────────────────────────────────────────────
if [[ "$PLATFORM" == "netlify" ]]; then
  echo ""
  echo "▸ Edge function"
  copy_file "$SCRIPT_DIR/security-shield.ts" "$TARGET/netlify/edge-functions"

  echo ""
  echo "▸ Config files"
  copy_file "$SCRIPT_DIR/_headers"        "$TARGET"
  copy_file "$SCRIPT_DIR/netlify.toml"    "$TARGET" "netlify.security.toml"

  echo ""
  echo "▸ Robots"
  copy_file "$SCRIPT_DIR/robots-public.txt"  "$TARGET"
  copy_file "$SCRIPT_DIR/robots-private.txt" "$TARGET"
  if [[ "$APP_TYPE" == "private" ]]; then
    cp "$SCRIPT_DIR/robots-private.txt" "$TARGET/robots.txt"
    echo "  ✓ robots.txt (private variant)"
  else
    cp "$SCRIPT_DIR/robots-public.txt" "$TARGET/robots.txt"
    echo "  ✓ robots.txt (public variant)"
  fi

  echo ""
  echo "▸ SEO templates"
  copy_file "$SCRIPT_DIR/sitemap-template.xml"   "$TARGET"
  copy_file "$SCRIPT_DIR/seo-meta-template.html" "$TARGET"

  echo ""
  echo "▸ Security disclosure"
  mkdir -p "$TARGET/.well-known"
  copy_file "$SCRIPT_DIR/security.txt" "$TARGET/.well-known"

  echo ""
  echo "⚠️  Next steps:"
  echo "   1. Merge netlify.security.toml into your existing netlify.toml"
  echo "   2. Replace {{DOMAIN}} in sitemap-template.xml and seo-meta-template.html"
  echo "   3. Replace {{EXPIRY_DATE_ISO8601}} in .well-known/security.txt"
  echo "      Run: date -u -v+1y '+%Y-%m-%dT%H:%M:%SZ'  (macOS)"
  echo "   4. Rename sitemap-template.xml → sitemap.xml and populate your URLs"
  if [[ "$APP_TYPE" == "private" ]]; then
    echo "   5. Remove /console/* and /api-docs redirect blocks from netlify.toml if those are real routes"
  fi
fi

# ─── Vercel ──────────────────────────────────────────────────────────────────
if [[ "$PLATFORM" == "vercel" ]]; then
  echo ""
  echo "▸ Middleware (Next.js)"
  copy_file "$SCRIPT_DIR/vercel/middleware.ts" "$TARGET"
  copy_file "$SCRIPT_DIR/vercel/vercel.json"   "$TARGET"

  echo ""
  echo "▸ Robots"
  copy_file "$SCRIPT_DIR/robots-public.txt"  "$TARGET/public"
  copy_file "$SCRIPT_DIR/robots-private.txt" "$TARGET/public"
  if [[ "$APP_TYPE" == "private" ]]; then
    cp "$SCRIPT_DIR/robots-private.txt" "$TARGET/public/robots.txt"
    echo "  ✓ public/robots.txt (private variant)"
  else
    cp "$SCRIPT_DIR/robots-public.txt" "$TARGET/public/robots.txt"
    echo "  ✓ public/robots.txt (public variant)"
  fi

  echo ""
  echo "▸ SEO templates"
  copy_file "$SCRIPT_DIR/sitemap-template.xml"   "$TARGET/public"
  copy_file "$SCRIPT_DIR/seo-meta-template.html" "$TARGET"

  echo ""
  echo "▸ Security disclosure"
  mkdir -p "$TARGET/public/.well-known"
  copy_file "$SCRIPT_DIR/security.txt" "$TARGET/public/.well-known"

  echo ""
  echo "⚠️  Next steps:"
  echo "   1. Merge vercel.json with your existing vercel.json"
  echo "   2. Replace {{DOMAIN}} in sitemap-template.xml and seo-meta-template.html"
  echo "   3. Replace {{EXPIRY_DATE_ISO8601}} in public/.well-known/security.txt"
  echo "      Run: date -u -v+1y '+%Y-%m-%dT%H:%M:%SZ'  (macOS)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Source of truth: apps/v-secure/security-shield/templates/"
echo " To update templates, edit there — not in deployed projects."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
