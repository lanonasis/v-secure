# 🔄 Deployment Synchronization Plan: REST API & MCP

**Objective**: Ensure both REST API and MCP deployments are synchronized with identical functionality, authentication, and data access patterns.

## 🏗️ Current Architecture Status

### ✅ **Working Components**
- **Memory Service REST API**: ✅ Running on localhost:3000 with npm
- **Remote MCP Connection**: ✅ Connected to api.lanonasis.com
- **CLI Tool**: ✅ MCP commands available in local build
- **Authentication**: ✅ API key system functioning

### ❌ **Issues Requiring Synchronization**
- **Local MCP Server**: ❌ Missing onasis-gateway dependency
- **CLI Build Errors**: ❌ TypeScript compilation failures
- **Published CLI**: ❌ Missing MCP commands in npm package v1.1.0

## 🎯 Deployment Synchronization Matrix

| Component | Local Dev | Production | Status | Action Required |
|-----------|-----------|------------|--------|-----------------|
| **REST API** | ✅ localhost:3000 | ✅ api.lanonasis.com | ✅ SYNCED | None |
| **MCP Server** | ❌ Missing deps | ✅ api.lanonasis.com | ⚠️ PARTIAL | Fix local setup |
| **CLI Tools** | ✅ Working | ❌ Incomplete | ❌ OUT OF SYNC | Republish npm |
| **Authentication** | ✅ API Keys | ✅ API Keys | ✅ SYNCED | None |
| **Memory Operations** | ✅ Direct API | ✅ Hybrid API/MCP | ⚠️ PARTIAL | Test parity |

## 🔧 Synchronization Plan

### Phase 1: Local Development Environment Sync (Priority: HIGH)

#### 1.1 Fix Local MCP Server Dependencies
```bash
# Problem: Missing onasis-gateway/mcp-server/server.js
# Solution: Create standalone MCP server or update CLI configuration

# Action 1: Update CLI to use memory service MCP server
cd cli/src/utils
# Edit mcp-client.ts to point to localhost:3000/mcp instead of onasis-gateway

# Action 2: Add MCP WebSocket endpoint to memory service
cd ../src/routes
# Add mcp.ts route handler for WebSocket connections
```

#### 1.2 Fix CLI TypeScript Compilation Errors
```bash
# Problem: Type mismatches between API interfaces and CLI usage
# Solution: Update type definitions and API response handling

# Key fixes needed:
# - src/commands/memory.ts: Fix pagination response properties
# - src/commands/topics.ts: Fix table configuration types
# - src/index.ts: Fix Help interface usage
```

### Phase 2: Production Deployment Sync (Priority: HIGH)

#### 2.1 Publish Updated CLI Package
```bash
# Prerequisites: Fix TypeScript compilation errors
npm run build
npm version patch  # Increment to v1.1.1
npm publish

# Verify MCP commands are included:
npx -y @lanonasis/cli mcp --help
```

#### 2.2 Production MCP Server Validation
```bash
# Test all MCP endpoints are accessible
curl -H "Upgrade: websocket" https://api.lanonasis.com/mcp
curl https://api.lanonasis.com/api/v1/mcp/tools
curl https://api.lanonasis.com/api/v1/mcp/status
```

### Phase 3: Feature Parity Validation (Priority: MEDIUM)

#### 3.1 Memory Operations Parity Test
| Operation | REST API | MCP Interface | Status |
|-----------|----------|---------------|--------|
| Create Memory | `POST /api/v1/memory` | `memory_create_memory` | ⏳ TEST |
| Search Memories | `POST /api/v1/memory/search` | `memory_search_memories` | ⏳ TEST |
| List Memories | `GET /api/v1/memory` | `memory_list_memories` | ⏳ TEST |
| Update Memory | `PUT /api/v1/memory/:id` | `memory_update_memory` | ⏳ TEST |
| Delete Memory | `DELETE /api/v1/memory/:id` | `memory_delete_memory` | ⏳ TEST |
| Bulk Operations | `POST /api/v1/memory/bulk` | `memory_bulk_operations` | ⏳ TEST |

#### 3.2 Authentication Parity Test
```bash
# Test 1: REST API with API Key
curl -H "X-API-Key: test-key" https://api.lanonasis.com/api/v1/memory

# Test 2: MCP with API Key
node dist/index.js mcp call memory_list_memories

# Expected: Both should return identical authentication responses
```

## 🚀 Implementation Steps

### Step 1: Fix Local MCP Server (30 minutes)
1. **Update MCP Client Configuration**:
   ```typescript
   // cli/src/utils/mcp-client.ts
   const LOCAL_MCP_SERVER_PATH = 'http://localhost:3000/mcp'; // Instead of onasis-gateway
   ```

2. **Add MCP WebSocket Endpoint to Memory Service**:
   ```typescript
   // src/routes/mcp.ts
   import { createServer } from 'http';
   import { WebSocketServer } from 'ws';
   
   export const createMCPServer = (httpServer) => {
     const wss = new WebSocketServer({ server: httpServer, path: '/mcp' });
     // Implement MCP protocol handlers
   };
   ```

### Step 2: Fix CLI Compilation Errors (45 minutes)
1. **Update Memory Command Types**:
   ```typescript
   // Fix pagination response handling
   interface PaginatedResponse<T> {
     data: T[];  // Instead of .memories or .results
     pagination: {
       total: number;
       page: number;
       pages: number;
       limit: number;
       offset: number;
       has_more: boolean;
     };
   }
   ```

2. **Fix Table Configuration**:
   ```typescript
   // Use proper table configuration format
   const tableConfig = {
     header: {
       content: ['ID', 'Title', 'Type', 'Created']
     },
     // ... rest of config
   };
   ```

### Step 3: Publish Synchronized CLI (15 minutes)
```bash
cd cli
npm run build          # Should complete without errors
npm run test           # Validate functionality
npm version patch      # v1.1.1
npm publish            # Push to npm registry
```

### Step 4: Validate Synchronization (30 minutes)
```bash
# Test Suite 1: Local Environment
npm install -g @lanonasis/cli@latest
lanonasis mcp connect --local    # Should work
lanonasis mcp connect --remote   # Should work
lanonasis memory list            # Should work via hybrid mode

# Test Suite 2: Production Environment
curl https://api.lanonasis.com/api/v1/health
lanonasis mcp status            # Should show connected
lanonasis mcp tools             # Should list all available tools
```

## 📊 Success Metrics

### Local Development Sync ✅
- [ ] MCP server starts without dependency errors
- [ ] CLI builds without TypeScript errors
- [ ] Local MCP connection successful
- [ ] Memory operations work via MCP locally

### Production Deployment Sync ✅
- [ ] Updated CLI package published to npm
- [ ] MCP commands available in published CLI
- [ ] Remote MCP connection functional
- [ ] API parity between REST and MCP endpoints

### Feature Parity Sync ✅
- [ ] All memory CRUD operations work identically via REST and MCP
- [ ] Authentication works consistently across both interfaces
- [ ] Error handling matches between REST and MCP
- [ ] Performance characteristics are comparable

## 🔍 Continuous Synchronization Strategy

### 1. **Automated Testing**
```yaml
# .github/workflows/sync-test.yml
name: REST API & MCP Sync Test
on: [push, pull_request]
jobs:
  test-sync:
    steps:
      - name: Test REST API endpoints
      - name: Test MCP tool endpoints  
      - name: Compare response schemas
      - name: Validate authentication parity
```

### 2. **Version Alignment**
- Memory Service API version: v1.0.0
- CLI with MCP: v1.1.1 (target)
- SDK: v1.0.0
- Ensure all components reference same API contract

### 3. **Documentation Sync**
- Update README.md with unified deployment instructions
- Sync api.lanonasis.com documentation with MCP tool descriptions
- Maintain feature parity matrix in documentation

## ⚠️ Critical Dependencies

### Must Fix Before Deployment Sync:
1. **CLI TypeScript Compilation**: Blocks npm package updates
2. **Local MCP Server Path**: Blocks local development workflow
3. **API Response Schema Alignment**: Ensures consistent behavior

### Can Fix After Initial Sync:
1. Memory service path-to-regexp routing errors
2. UI Kit build configuration
3. Comprehensive integration testing

---

**Next Actions**: Execute Step 1 (Fix Local MCP Server Configuration) to enable local development sync, then proceed with CLI compilation fixes.