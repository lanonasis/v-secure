# 🚀 Vortex Secure - Deployment Guide for admin.connectionpoint.tech

## 📋 Prerequisites

- Node.js 18+
- Supabase account
- Domain: `admin.connectionpoint.tech`
- VPS with SSH access (for VPS management features)

## ⚡ Quick Deployment

### Step 1: Supabase Setup

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com/dashboard
   # Create new project: "vortex-secure-admin"
   # Note your project URL and anon key
   ```

2. **Run Database Schema**
   ```sql
   -- In Supabase SQL Editor, run the complete schema:
   -- Copy contents of supabase-schema.sql and execute
   ```

3. **Configure Authentication**
   ```bash
   # In Supabase Dashboard > Authentication > Settings
   # Enable GitHub OAuth (for admin login)
   # Enable Google OAuth (optional)
   # Add redirect URL: https://admin.connectionpoint.tech
   ```

### Step 2: Environment Configuration

Create `.env.local`:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Domain Configuration  
VITE_APP_URL=https://admin.connectionpoint.tech
VITE_API_URL=https://admin.connectionpoint.tech/api

# VPS Management (optional)
VPS_SSH_KEY_PATH=/path/to/ssh/key
VPS_DEFAULT_USER=root
VPS_DEFAULT_PORT=2222

# MCP Integration
VITE_MCP_WEBSOCKET_URL=wss://admin.connectionpoint.tech/mcp/events

# Demo Mode (remove for production)
VITE_DEMO_MODE=true
```

### Step 3: Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to your server
scp -r dist/* user@admin.connectionpoint.tech:/var/www/vortex-secure/
```

### Step 4: Nginx Configuration

Create `/etc/nginx/sites-available/admin.connectionpoint.tech`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name admin.connectionpoint.tech;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.connectionpoint.tech;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.connectionpoint.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.connectionpoint.tech/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;

    # Root directory
    root /var/www/vortex-secure;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy (if needed)
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for MCP
    location /mcp/events {
        proxy_pass http://localhost:3001/mcp/events;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

### Step 5: SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d admin.connectionpoint.tech

# Test renewal
sudo certbot renew --dry-run
```

### Step 6: Enable and Start Services

```bash
# Enable nginx site
sudo ln -s /etc/nginx/sites-available/admin.connectionpoint.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start application (if you have a backend API)
# pm2 start ecosystem.config.js
```

## 🔧 Advanced Configuration

### Backend API Setup (Optional)

If you need server-side functionality:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'vortex-secure-api',
    script: './api/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY
    }
  }]
};
```

### VPS Management Integration

For the VPS management features to work:

1. **SSH Key Setup**
   ```bash
   # Generate SSH key for VPS access
   ssh-keygen -t rsa -b 4096 -f /etc/vortex-secure/ssh-key
   
   # Add public key to target VPS servers
   ssh-copy-id -i /etc/vortex-secure/ssh-key.pub root@your-vps-ip
   ```

2. **API Endpoints for VPS Management**
   ```javascript
   // api/routes/vps.js
   app.get('/api/vps/servers', async (req, res) => {
     // Return list of VPS servers from database
   });
   
   app.post('/api/vps/execute', async (req, res) => {
     // Execute SSH commands on VPS
   });
   ```

### Monitoring and Logging

```bash
# Set up log rotation
sudo tee /etc/logrotate.d/vortex-secure << EOF
/var/log/vortex-secure/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

## 🔒 Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key-based authentication enabled
- [ ] Supabase RLS policies configured
- [ ] Security headers configured in Nginx
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

## 🧪 Testing Deployment

### 1. Access the Dashboard
```bash
# Open browser and navigate to:
https://admin.connectionpoint.tech

# Should show Vortex Secure login page
```

### 2. Test Authentication
```bash
# Click "Continue with GitHub"
# Should redirect to GitHub OAuth
# After auth, should land on dashboard
```

### 3. Test Features
- **Dashboard**: Should show demo data and stats
- **Secrets**: Should list demo secrets
- **MCP Monitoring**: Should show registered MCP tools  
- **VPS Management**: Should show your configured servers
- **Analytics**: Should display placeholder analytics

### 4. Test VPS Management
```bash
# In VPS Management page:
# 1. Should show server status
# 2. Click "Terminal" button
# 3. Try commands like "pm2 list" or "systemctl status nginx"  
# 4. Should execute and show output
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Supabase Connection Issues**
   ```bash
   # Check environment variables
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   
   # Test connection
   curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/
   ```

3. **SSH Connection Issues**
   ```bash
   # Test SSH connectivity
   ssh -i /etc/vortex-secure/ssh-key -p 2222 root@your-vps-ip
   
   # Check SSH service on target VPS
   sudo systemctl status sshd
   sudo systemctl restart sshd
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R www-data:www-data /var/www/vortex-secure
   sudo chmod -R 755 /var/www/vortex-secure
   ```

### Logs to Check

```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs (if using PM2)
pm2 logs vortex-secure-api

# System logs
sudo journalctl -u nginx -f
```

## 📊 Monitoring

### Health Check Endpoint

Add to your nginx config:
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

### Uptime Monitoring

```bash
# Add to crontab for basic monitoring
*/5 * * * * curl -f https://admin.connectionpoint.tech/health > /dev/null 2>&1 || echo "Vortex Secure is down" | mail -s "Alert" admin@connectionpoint.tech
```

## 🎯 Next Steps

1. **Configure Custom Domain**: Update DNS to point to your server
2. **Set Up Backups**: Implement database and file backups  
3. **Add Team Members**: Invite admin team to Supabase project
4. **Configure Monitoring**: Set up uptime monitoring and alerts
5. **Test VPS Integration**: Verify SSH connectivity to all managed servers
6. **Security Audit**: Review all security configurations

Your Vortex Secure admin dashboard is now ready at **admin.connectionpoint.tech**! 🎉