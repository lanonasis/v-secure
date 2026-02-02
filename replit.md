# VortexShield Security Service

## Overview
VortexShield is an enterprise-grade security infrastructure platform for cross-border safety. It provides secret management, API key handling, encryption, and access control with compliance standards (SOC 2, ISO 27001, GDPR).

## Project Structure
- `/web` - Next.js frontend application (landing page and console) - Port 5000
- `/vortex-secure` - React dashboard for managing secrets, API keys, memories, and MCP services - Port 5173
- `/security-sdk` - Security SDK package
- `/oauth-client` - OAuth client package
- `/privacy-sdk` - Privacy SDK
- `/security-shield` - Security shield components
- `/database` - Database schemas and migrations
- `/docs` - Documentation
- `/auth-gateway-oauth2-pkce` - OAuth2 PKCE authentication gateway

## Development

### Running Locally
Two workflows are configured:
1. **Web App** (port 5000): `cd web && npm run dev -- -p 5000 -H 0.0.0.0`
2. **Dashboard** (port 5173): `cd vortex-secure && npm run dev`

### Tech Stack
- **Frontend**: Next.js 16 with React 18, Tailwind CSS
- **Dashboard**: React + Vite with TypeScript, Tailwind CSS
- **Backend Services**: Node.js with TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: OAuth2 PKCE

### Environment Variables
Required secrets (stored in Replit Secrets):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

The vortex-secure dashboard uses these same secrets via Vite config.

### Data Hooks
The dashboard uses real Supabase data via hooks:
- `useAPIKeys` - API key management
- `useSecrets` - Secrets management with rotation tracking
- `useMemories` - Memory storage (context, project, knowledge, reference, personal, workflow)
- `useMCPServices` - MCP service configuration
- `useDashboard` - Dashboard statistics

## Deployment
The project is configured for autoscale deployment on Replit. The build command compiles the Next.js application and the run command starts the production server.
