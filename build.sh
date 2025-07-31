#!/bin/bash

# Vortex API Key Manager Build Script

echo "Building Vortex API Key Manager..."

# Build MCP SDK
echo "Building MCP SDK..."
cd packages/vortex-mcp-sdk
npm run build
cd ../..

echo "MCP SDK built successfully!"

# Build CLI
echo "Building CLI..."
cd vortex-cli
npm run build
cd ..

echo "CLI built successfully!"

echo "Build complete!"
echo ""
echo "To use the CLI:"
echo "  npm link -w @vortex-secure/cli"
echo "  vortex --help"
echo ""
echo "To use the SDK in your project:"
echo "  npm install @vortex-secure/mcp-sdk"
