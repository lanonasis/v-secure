# ⚡ Quick Start Guide

Get up and running with the LanOnasis Security Service in 5 minutes!

## 🚀 5-Minute Setup

### Step 1: Navigate to Security Service (30 seconds)

```bash
cd security-service
```

### Step 2: Install Dependencies (2 minutes)

```bash
npm install
# or
bun install
```

### Step 3: Configure Environment (1 minute)

```bash
# Copy example environment
cp .env.example .env

# Edit with your credentials
nano .env
```

**Minimum required configuration:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secret-key-min-32-characters
API_KEY_ENCRYPTION_KEY=your-encryption-key-min-32-chars
```

### Step 4: Run Database Migrations (1 minute)

```bash
./scripts/migrate.sh
```

### Step 5: Start the Service (30 seconds)

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
```

✅ **Done!** Your security service is running at `http://localhost:3000`

---

## 🧪 Test It Out

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Store a Secret

```bash
curl -X POST http://localhost:3000/api/v1/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "TEST_SECRET",
    "value": "my-secret-value"
  }'
```

### 3. Retrieve a Secret

```bash
curl http://localhost:3000/api/v1/secrets/TEST_SECRET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📖 Common Use Cases

### Use Case 1: Store Database Credentials

```typescript
import { SecretService } from './security-service';

const secretService = new SecretService();

await secretService.storeSecret(
  'DATABASE_URL',
  'postgresql://user:pass@localhost:5432/db'
);
```

### Use Case 2: Manage API Keys

```typescript
import { ApiKeyService } from './security-service';

const apiKeyService = new ApiKeyService();

const apiKey = await apiKeyService.createApiKey({
  name: 'Production API Key',
  value: 'sk_live_abc123',
  keyType: 'api_key',
  environment: 'production',
  projectId: 'project-uuid',
  rotationFrequency: 90
}, userId);
```

### Use Case 3: MCP Tool Integration

```typescript
// Register an AI tool
const tool = await apiKeyService.registerMCPTool({
  toolId: 'claude-assistant',
  toolName: 'Claude Code Assistant',
  organizationId: 'org-uuid',
  permissions: {
    keys: ['GITHUB_TOKEN'],
    environments: ['development'],
    maxConcurrentSessions: 3,
    maxSessionDuration: 900
  },
  autoApprove: false,
  riskLevel: 'medium'
}, userId);

// Request access
const requestId = await apiKeyService.createMCPAccessRequest({
  toolId: 'claude-assistant',
  organizationId: 'org-uuid',
  keyNames: ['GITHUB_TOKEN'],
  environment: 'development',
  justification: 'Code review assistance',
  estimatedDuration: 600
});
```

---

## 🔧 Integration Options

### Option 1: Standalone Microservice

Deploy as a separate service and call via HTTP:

```typescript
// In your application
const response = await fetch('http://security-service:3000/api/v1/secrets/KEY', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const secret = await response.json();
```

### Option 2: Direct Module Import

Import directly into your project:

```typescript
// In your application
import { SecretService } from './security-service';

const secretService = new SecretService();
const secret = await secretService.getSecret('DATABASE_URL');
```

### Option 3: NPM Package

Publish and install as a package:

```bash
# Publish (one time)
cd security-service
npm publish

# Install in your project
npm install @lanonasis/security-service
```

```typescript
// Use in your application
import { SecretService } from '@lanonasis/security-service';
```

---

## 🐳 Docker Quick Start

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker

```bash
# Build image
docker build -t security-service .

# Run container
docker run -d \
  -p 3000:3000 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_KEY=your-key \
  -e JWT_SECRET=your-secret \
  --name security-service \
  security-service
```

---

## 🔐 Security Checklist

Before going to production, ensure:

- [ ] Changed all default secrets in `.env`
- [ ] Generated strong encryption keys (32+ characters)
- [ ] Enabled HTTPS/TLS
- [ ] Configured rate limiting
- [ ] Set up monitoring and alerts
- [ ] Enabled audit logging
- [ ] Configured backup strategy
- [ ] Reviewed RLS policies
- [ ] Tested disaster recovery
- [ ] Documented security procedures

---

## 📚 Next Steps

### Learn More
- 📖 [Full Documentation](README.md)
- 🛡️ [Security Standards](SECURITY_STANDARDS.md)
- 🚀 [Deployment Guide](DEPLOYMENT_GUIDE.md)
- ✅ [Migration Summary](MIGRATION_SUMMARY.md)

### Implement Features
1. **Add Tests**: Write unit and integration tests
2. **Set Up Monitoring**: Configure Sentry, Prometheus, etc.
3. **Enable MFA**: Implement multi-factor authentication
4. **Configure Backups**: Set up automated backups
5. **Deploy to Production**: Follow deployment guide

### Advanced Topics
- **Key Rotation**: Implement automated rotation
- **Compliance**: Prepare for SOC 2 audit
- **AI Features**: Add anomaly detection
- **Multi-Region**: Deploy across regions
- **High Availability**: Set up clustering

---

## 🆘 Troubleshooting

### Service Won't Start

```bash
# Check environment variables
cat .env

# Verify database connection
psql $SUPABASE_URL -c "SELECT 1"

# Check logs
npm run dev
```

### Authentication Errors

```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Test with a valid token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/secrets
```

### Database Errors

```bash
# Re-run migrations
./scripts/migrate.sh

# Check database tables
psql $SUPABASE_URL -c "\dt"
```

---

## 💡 Pro Tips

1. **Use Environment-Specific Configs**: Separate dev, staging, prod
2. **Enable Debug Logging**: Set `LOG_LEVEL=debug` during development
3. **Monitor Audit Logs**: Regularly review security events
4. **Rotate Keys Regularly**: Set up automated rotation
5. **Test Disaster Recovery**: Practice backup/restore procedures
6. **Document Everything**: Keep security procedures updated
7. **Stay Updated**: Follow security advisories

---

## 📞 Get Help

- **Documentation**: Check README.md first
- **Examples**: See `examples/` folder
- **Issues**: GitHub issues for bugs
- **Security**: Email security@lanonasis.com
- **Community**: Join Discord for discussions

---

## 🎉 You're Ready!

Your security service is now set up and ready to use. Start building secure applications with confidence!

**Happy Coding! 🚀**

---

**Last Updated**: January 2024  
**Version**: 1.0.0
