#!/bin/bash

# Database Migration Script
set -e

echo "🗄️  Running database migrations..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Installing..."
  npm install -g supabase
fi

# Run migrations
echo "📊 Applying schema..."
psql $SUPABASE_URL -f database/schema.sql
psql $SUPABASE_URL -f database/enterprise-secrets-schema.sql
psql $SUPABASE_URL -f database/schema-api-keys.sql

echo "✅ Migrations completed successfully!"
