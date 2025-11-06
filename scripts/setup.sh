#!/bin/bash

# Security Service Setup Script
set -e

echo "🔐 Setting up Security Service..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env from example
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your configuration"
fi

# Run migrations
echo "🗄️  Running database migrations..."
./scripts/migrate.sh

# Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run 'npm run dev' to start development server"
echo "3. Run 'npm test' to run tests"
