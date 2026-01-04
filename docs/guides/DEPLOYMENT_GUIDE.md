# 🚀 Deployment Guide

Complete guide for deploying the LanOnasis Security Service in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Standalone Deployment](#standalone-deployment)
3. [Integration with Existing Projects](#integration-with-existing-projects)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher (or Bun 1.x)
- **PostgreSQL**: 14.x or higher (or Supabase account)
- **Redis**: 6.x or higher (optional, for distributed rate limiting)
- **Memory**: Minimum 512MB RAM
- **Storage**: Minimum 1GB available space

### Required Accounts
- Supabase account (or self-hosted PostgreSQL)
- (Optional) Redis Cloud account
- (Optional) Sentry account for error tracking

---

## Standalone Deployment

### Step 1: Clone/Copy the Security Service

```bash
# If part of a larger repo
cp -r security-service /path/to/deployment/

# Or clone if standalone
git clone https://github.com/lanonasis/security-service.git
cd security-service
```

### Step 2: Install Dependencies

```bash
# Using npm
npm install

# Using bun
bun install

# Using yarn
yarn install
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required Environment Variables:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-min-32-chars
API_KEY_ENCRYPTION_KEY=your-encryption-key-min-32-chars
```

### Step 4: Run Database Migrations

```bash
# Using the migration script
./scripts/migrate.sh

# Or manually
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/enterprise-secrets-schema.sql
psql $DATABASE_URL -f database/schema-api-keys.sql
```

### Step 5: Build and Start

```bash
# Build
npm run build

# Start in production mode
npm start

# Or start in development mode
npm run dev
```

### Step 6: Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Test secret creation
curl -X POST http://localhost:3000/api/v1/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"TEST_SECRET","value":"test123"}'
```

---

## Integration with Existing Projects

### Option 1: As a Microservice

Deploy the security service as a separate microservice and call it via HTTP:

```typescript
// In your main application
import axios from 'axios';

const securityServiceUrl = process.env.SECURITY_SERVICE_URL;

async function getSecret(key: string): Promise<string> {
  const response = await axios.get(
    `${securityServiceUrl}/api/v1/secrets/${key}`,
    {
      headers: {
        'Authorization': `Bearer ${yourJwtToken}`
      }
    }
  );
  return response.data.value;
}
```

### Option 2: As a Module

Import the security service directly into your project:

```typescript
// In your main application
import { SecretService, ApiKeyService } from './security-service';

const secretService = new SecretService();
const apiKeyService = new ApiKeyService();

// Use directly
const secret = await secretService.getSecret('DATABASE_URL');
```

### Option 3: As an NPM Package

Publish and install as a package:

```bash
# In security-service directory
npm publish

# In your project
npm install @lanonasis/security-service
```

```typescript
// In your application
import { SecretService } from '@lanonasis/security-service';

const secretService = new SecretService();
```

---

## Environment Configuration

### Development Environment

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_KEY=dev-service-key

JWT_SECRET=dev-jwt-secret-min-32-chars
API_KEY_ENCRYPTION_KEY=dev-encryption-key-min-32-chars

# Optional: Local Redis
REDIS_URL=redis://localhost:6379
```

### Staging Environment

```env
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_KEY=staging-service-key

JWT_SECRET=staging-jwt-secret-min-32-chars
API_KEY_ENCRYPTION_KEY=staging-encryption-key-min-32-chars

# Redis for rate limiting
REDIS_URL=redis://staging-redis:6379
REDIS_PASSWORD=staging-redis-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ENABLE_MONITORING=true
```

### Production Environment

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_KEY=prod-service-key

JWT_SECRET=prod-jwt-secret-min-32-chars-CHANGE-THIS
API_KEY_ENCRYPTION_KEY=prod-encryption-key-min-32-chars-CHANGE-THIS

# Production Redis
REDIS_URL=redis://prod-redis:6379
REDIS_PASSWORD=prod-redis-password-CHANGE-THIS

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://your-production-sentry-dsn
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true

# Logging
LOG_FILE_PATH=/var/log/security-service/app.log
```

---

## Database Setup

### Using Supabase (Recommended)

1. **Create a Supabase Project**
   ```bash
   # Visit https://supabase.com/dashboard
   # Create new project
   # Note your project URL and keys
   ```

2. **Run Migrations via Supabase Dashboard**
   - Go to SQL Editor
   - Copy contents of `database/schema.sql`
   - Execute
   - Repeat for other schema files

3. **Enable Row Level Security**
   - RLS is automatically enabled in the schema files
   - Verify in Table Editor > Policies

### Using Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-14

   # macOS
   brew install postgresql@14
   ```

2. **Create Database**
   ```bash
   createdb security_service
   ```

3. **Run Migrations**
   ```bash
   psql security_service -f database/schema.sql
   psql security_service -f database/enterprise-secrets-schema.sql
   psql security_service -f database/schema-api-keys.sql
   ```

4. **Create Database User**
   ```sql
   CREATE USER security_service_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE security_service TO security_service_user;
   ```

---

## Production Deployment

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  security-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY_ENCRYPTION_KEY=${API_KEY_ENCRYPTION_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

**Deploy:**
```bash
docker-compose up -d
```

### Kubernetes Deployment

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-service
  template:
    metadata:
      labels:
        app: security-service
    spec:
      containers:
      - name: security-service
        image: lanonasis/security-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: security-service-secrets
              key: supabase-url
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              name: security-service-secrets
              key: supabase-service-key
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: security-service-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: security-service
spec:
  selector:
    app: security-service
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Deploy:**
```bash
kubectl apply -f deployment.yaml
```

### Cloud Platform Deployments

#### AWS (Elastic Beanstalk)
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 security-service

# Create environment
eb create production

# Deploy
eb deploy
```

#### Google Cloud (Cloud Run)
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/security-service

# Deploy
gcloud run deploy security-service \
  --image gcr.io/PROJECT_ID/security-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure (App Service)
```bash
# Create resource group
az group create --name security-service-rg --location eastus

# Create app service plan
az appservice plan create --name security-service-plan \
  --resource-group security-service-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group security-service-rg \
  --plan security-service-plan --name security-service \
  --runtime "NODE|18-lts"

# Deploy
az webapp deployment source config-zip \
  --resource-group security-service-rg \
  --name security-service --src deploy.zip
```

---

## Monitoring & Maintenance

### Health Checks

```typescript
// Add to your server
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### Logging

```typescript
// Use structured logging
import { logger } from './utils/logger';

logger.info('Secret accessed', {
  secretId: 'secret-123',
  userId: 'user-456',
  action: 'read'
});
```

### Metrics

```typescript
// Prometheus metrics
import prometheus from 'prom-client';

const secretAccessCounter = new prometheus.Counter({
  name: 'secret_access_total',
  help: 'Total number of secret accesses'
});

secretAccessCounter.inc();
```

### Alerts

**Set up alerts for:**
- Failed authentication attempts (> 10/minute)
- Unusual secret access patterns
- High error rates (> 5%)
- Service downtime
- Database connection failures

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database connectivity
psql $SUPABASE_URL -c "SELECT 1"

# Verify credentials
echo $SUPABASE_SERVICE_KEY
```

#### 2. Encryption Errors
```bash
# Ensure encryption key is set and correct length
echo $API_KEY_ENCRYPTION_KEY | wc -c  # Should be >= 32
```

#### 3. Authentication Failures
```bash
# Verify JWT secret
echo $JWT_SECRET | wc -c  # Should be >= 32

# Test JWT token
curl -X GET http://localhost:3000/api/v1/secrets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Rate Limiting Issues
```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping

# Clear rate limit
redis-cli -u $REDIS_URL DEL rate_limit:user:123
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev
```

### Support

- **Documentation**: https://docs.lanonasis.com
- **Email**: support@lanonasis.com
- **Discord**: https://discord.gg/lanonasis
- **GitHub Issues**: https://github.com/lanonasis/security-service/issues

---

**Last Updated**: January 2024  
**Version**: 1.0.0
