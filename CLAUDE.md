# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this multi-project workspace.

## Workspace Overview

This workspace contains three main projects:

1. **Vortex API Key Manager** (`/Users/seyederick/DevOps/_project_folders/vortex-api-key-manager/`)
2. **LanOnasis Website** (`/Users/seyederick/LanOnasisIndex/`)
3. **LanOnasis MaaS** (`/Users/seyederick/DevOps/_project_folders/lanonasis-maas/`)

---

## 1. Vortex API Key Manager

### Development Commands
```bash
# Build all packages in the monorepo
npm run build

# Build specific packages
npm run build -w @vortex-secure/mcp-sdk
npm run build -w @vortex-secure/cli

# Test all packages
npm run test

# Run the CLI in development mode
npm run cli

# Build SDK only
npm run sdk

# Link CLI for local development
npm link -w @vortex-secure/cli

# Test SDK functionality
node test-sdk.js
```

### Architecture Overview
Monorepo containing two main packages for secure API key management:

#### Vortex MCP SDK (`packages/vortex-mcp-sdk/`)
- TypeScript SDK providing secure, temporary access to secrets for AI agents
- Uses zero-trust architecture with automatic token expiration
- Main entry point: `src/index.ts` exports `VortexMCPClient` class
- Key method: `useSecret()` provides a callback pattern that ensures secrets are never stored

#### Vortex CLI (`vortex-cli/`)
- Command-line interface for managing secrets, projects, and rotations
- Built with commander.js for command structure
- Main commands: login, set, get, list, schedule, rotate
- Uses keytar for secure credential storage
- Entry point: `src/index.ts`

#### Database Schema (`supabase-schema.sql`)
- PostgreSQL schema designed for Supabase
- Core tables: projects, secrets, rotation_policies, usage_metrics, security_events
- MCP-specific tables: mcp_tools, mcp_tool_permissions, mcp_access_logs
- Implements Row Level Security (RLS) for data isolation

#### Key Concepts
1. **Automated Rotation**: Secrets can be scheduled for automatic rotation with zero downtime
2. **MCP Integration**: First-in-market integration with Model Context Protocol for AI agent access
3. **Zero-Trust Access**: Temporary tokens that automatically expire after use
4. **Usage Analytics**: Real-time tracking of secret access patterns

---

## 2. LanOnasis Website

### Development Commands
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview
```

### Architecture Overview
Modern React website built with Vite and TypeScript:

- **Frontend Stack**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom animations
- **3D Effects**: Three.js with Vanta.js for visual effects
- **Animation**: Framer Motion for smooth transitions
- **SEO**: React Helmet Async for meta management
- **Entry Point**: `src/main.tsx`
- **Main Component**: `src/App.tsx`
- **Routes**: `src/routes/` (Contact, Ecosystem, Story, Vision)
- **Build Target**: Static site deployment ready

---

## 3. LanOnasis MaaS (Memory as a Service)

### Development Commands
```bash
# Main Service
npm run dev              # Development server with hot reload
npm run build           # Compile TypeScript
npm run start           # Production server
npm run type-check      # TypeScript checking
npm run lint            # ESLint
npm run test            # Run tests
npm run test:coverage   # Tests with coverage

# Database
npm run db:migrate      # Apply migrations
npm run db:seed         # Seed test data

# Docker & Deployment
docker-compose up                              # Local development
docker-compose -f docker-compose.prod.yml up  # Production
kubectl apply -f k8s/                         # Kubernetes deploy
```

### Architecture Overview
Enterprise-grade Memory as a Service microservice:

#### Core Components
1. **API Server** (`src/server.ts`) - Express.js with enterprise middleware
2. **Authentication System** - JWT-based with multi-tenant support
3. **Memory Service** - Vector-based storage with OpenAI embeddings
4. **Database Layer** - Supabase (PostgreSQL + pgvector)
5. **CLI Tool** (`cli/`) - Professional CLI for memory operations
6. **Extensions** - VS Code, Cursor, Windsurf extensions
7. **Dashboard** (`dashboard/`) - React-based web interface

#### Key Features
- **Multi-tenant architecture** with organization-based isolation
- **Vector similarity search** using OpenAI embeddings
- **Enterprise security** with authentication, rate limiting, monitoring
- **Memory types**: context, project, knowledge, reference, personal, workflow
- **Multiple interfaces**: REST API, CLI, IDE extensions, web dashboard

#### Database Schema
- Multi-tenant schema with organizations, users, memory_entries
- Vector storage with pgvector extension
- RLS policies for data isolation
- Audit trails and versioning

---

## Working Across Projects

### Common Patterns
- All projects use TypeScript and npm
- Modern build tools (Vite for frontend, tsc for backend)
- ESLint for code quality
- Environment-based configuration

### Testing Approach
- **Vortex**: Jest for SDK, manual testing for CLI
- **LanOnasis Website**: Vite's built-in testing capabilities
- **LanOnasis MaaS**: Jest with comprehensive unit/integration/e2e tests

### Deployment
- **Vortex**: npm packages + standalone deployment
- **LanOnasis Website**: Static site (Netlify ready)
- **LanOnasis MaaS**: Docker + Kubernetes with enterprise deployment