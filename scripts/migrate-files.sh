#!/bin/bash

# Security Service Migration Script
# This script migrates all security-related files to the security-service folder
# while preserving dependencies and ensuring the service can be used standalone

set -e

echo "🔐 Starting Security Service Migration..."

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p security-service/{services,middleware,routes,database,types,tests/{unit,integration,security},scripts,examples,docs}

# Copy service files
echo "📦 Copying service files..."
cp src/services/secretService.ts security-service/services/
cp src/services/apiKeyService.ts security-service/services/

# Copy middleware
echo "🔒 Copying middleware..."
cp src/middleware/auth.ts security-service/middleware/

# Copy routes
echo "🛣️  Copying route files..."
cp src/routes/api-secrets.ts security-service/routes/ 2>/dev/null || echo "⚠️  api-secrets.ts not found"
cp src/routes/api-keys.ts security-service/routes/ 2>/dev/null || echo "⚠️  api-keys.ts not found"
cp src/routes/mcp-api-keys.ts security-service/routes/ 2>/dev/null || echo "⚠️  mcp-api-keys.ts not found"

# Copy database schemas
echo "🗄️  Copying database schemas..."
cp src/db/schema.sql security-service/database/ 2>/dev/null || echo "⚠️  schema.sql not found"
cp src/db/enterprise-secrets-schema.sql security-service/database/ 2>/dev/null || echo "⚠️  enterprise-secrets-schema.sql not found"
cp src/db/schema-api-keys.sql security-service/database/ 2>/dev/null || echo "⚠️  schema-api-keys.sql not found"

# Copy type definitions
echo "📝 Copying type definitions..."
cp src/types/auth.ts security-service/types/ 2>/dev/null || echo "⚠️  auth.ts not found"

# Copy documentation
echo "📚 Copying documentation..."
cp SECRET_MANAGER_ROADMAP.md security-service/docs/
cp PHASED_EXECUTION_PLAN.md security-service/docs/ 2>/dev/null || echo "⚠️  PHASED_EXECUTION_PLAN.md not found"
cp DEPLOYMENT_SYNCHRONIZATION_PLAN.md security-service/docs/ 2>/dev/null || echo "⚠️  DEPLOYMENT_SYNCHRONIZATION_PLAN.md not found"

# Create package.json for standalone usage
echo "📦 Creating package.json..."
cat > security-service/package.json << 'EOF'
{
  "name": "@lanonasis/security-service",
  "version": "1.0.0",
  "description": "Enterprise-grade security service for secrets, API keys, and access control",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "migrate": "./scripts/migrate.sh",
    "type-check": "tsc --noEmit"
  },
  "keywords": [
    "security",
    "secrets",
    "api-keys",
    "encryption",
    "access-control",
    "compliance",
    "audit",
    "mcp",
    "enterprise"
  ],
  "author": "Seye Derick",
  "license": "MIT",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^22.10.2",
    "@typescript-eslint/eslint-plugin": "^8.18.1",
    "@typescript-eslint/parser": "^8.18.1",
    "eslint": "^9.17.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "tsx": "^4.7.0",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Create tsconfig.json
echo "⚙️  Creating tsconfig.json..."
cat > security-service/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "services/**/*",
    "middleware/**/*",
    "routes/**/*",
    "types/**/*",
    "scripts/**/*",
    "examples/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
EOF

# Create .env.example
echo "🔧 Creating .env.example..."
cat > security-service/.env.example << 'EOF'
# Supabase Configuration
https://<project-ref>.supabase.co
REDACTED_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
REDACTED_SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY

# JWT Configuration
REDACTED_JWT_SECRET=REDACTED_JWT_SECRET

# Encryption Configuration
API_KEY_ENCRYPTION_KEY=your-encryption-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Server Configuration
PORT=3000
NODE_ENV=development

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (optional, for distributed rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/security-service.log

# Monitoring (optional)
SENTRY_DSN=
ENABLE_ANALYTICS=false
ENABLE_MONITORING=false
EOF

# Create migration script
echo "🔄 Creating migration script..."
cat > security-service/scripts/migrate.sh << 'EOF'
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
psql $SUPABASE_URL=https://<project-ref>.supabase.co
psql $SUPABASE_URL=https://<project-ref>.supabase.co
psql $SUPABASE_URL=https://<project-ref>.supabase.co

echo "✅ Migrations completed successfully!"
EOF

chmod +x security-service/scripts/migrate.sh

# Create setup script
echo "🚀 Creating setup script..."
cat > security-service/scripts/setup.sh << 'EOF'
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
EOF

chmod +x security-service/scripts/setup.sh

# Create index.ts for exports
echo "📤 Creating index.ts..."
cat > security-service/index.ts << 'EOF'
/**
 * LanOnasis Security Service
 * Enterprise-grade security for secrets, API keys, and access control
 */

// Services
export { SecretService } from './services/secretService';
export { ApiKeyService, apiKeyService } from './services/apiKeyService';

// Middleware
export { authMiddleware, requireRole, requirePlan } from './middleware/auth';

// Types
export type { UnifiedUser } from './middleware/auth';
export type { JWTPayload } from './types/auth';
export type {
  ApiKey,
  ApiKeyProject,
  MCPTool,
  MCPSession
} from './services/apiKeyService';

// Re-export for convenience
export * from './services/secretService';
export * from './services/apiKeyService';
EOF

# Create basic usage example
echo "📖 Creating usage examples..."
cat > security-service/examples/basic-usage.ts << 'EOF'
/**
 * Basic Usage Example
 * Demonstrates core functionality of the security service
 */

import { SecretService, ApiKeyService } from '../index';

async function basicExample() {
  // Initialize services
  const secretService = new SecretService();
  const apiKeyService = new ApiKeyService();

  // Store a secret
  console.log('Storing secret...');
  await secretService.storeSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

  // Retrieve a secret
  console.log('Retrieving secret...');
  const dbUrl = await secretService.getSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  console.log('Database URL:', dbUrl);

  // Create an API key
  console.log('Creating API key...');
  const apiKey = await apiKeyService.createApiKey({
    name: 'Test API Key',
    value: 'sk_test_123456789',
    keyType: 'api_key',
    environment: 'development',
    projectId: 'project-uuid',
    tags: ['test'],
    rotationFrequency: 90
  }, 'user-uuid');

  console.log('API Key created:', apiKey.id);

  // List API keys
  console.log('Listing API keys...');
  const keys = await apiKeyService.getApiKeys('org-uuid');
  console.log(`Found ${keys.length} API keys`);
}

// Run example
basicExample().catch(console.error);
EOF

# Create .gitignore
echo "🚫 Creating .gitignore..."
cat > security-service/.gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Production
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📁 Security service created at: ./security-service/"
echo ""
echo "Next steps:"
echo "1. cd security-service"
echo "2. ./scripts/setup.sh"
echo "3. Edit .env with your configuration"
echo "4. npm run dev"
echo ""
echo "📚 See security-service/README.md for full documentation"
