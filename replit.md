# VortexShield Security Service

## Overview
VortexShield is an enterprise-grade security infrastructure platform for cross-border safety. It provides secret management, API key handling, encryption, and access control with compliance standards (SOC 2, ISO 27001, GDPR).

## Project Structure
- `/web` - Next.js frontend application (landing page and console)
- `/security-sdk` - Security SDK package
- `/oauth-client` - OAuth client package
- `/vortex-secure` - Vortex secure packages
- `/privacy-sdk` - Privacy SDK
- `/security-shield` - Security shield components
- `/database` - Database schemas and migrations
- `/docs` - Documentation
- `/auth-gateway-oauth2-pkce` - OAuth2 PKCE authentication gateway

## Development

### Running Locally
The web application runs on port 5000:
```bash
cd web && npm run dev -- -p 5000 -H 0.0.0.0
```

### Tech Stack
- **Frontend**: Next.js 16 with React 18, Tailwind CSS
- **Backend Services**: Node.js with TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: OAuth2 PKCE

## Deployment
The project is configured for autoscale deployment on Replit. The build command compiles the Next.js application and the run command starts the production server.
