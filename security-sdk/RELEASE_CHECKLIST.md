# Release Checklist for v1.0.3

## ✅ Pre-Release Verification

### Build Status
- [x] Package builds successfully (`npm run build`)
- [x] All TypeScript files compile without errors
- [x] All test files pass (`npm test` - 18/18 tests passing)
- [x] Distribution files generated correctly

### Package Structure
- [x] `dist/hash-utils.js` (ESM) - 1.85 KB
- [x] `dist/hash-utils.cjs` (CommonJS) - 3.82 KB
- [x] `dist/hash-utils.d.ts` (TypeScript types) - 2.65 KB
- [x] `dist/hash-utils.d.cts` (CommonJS types) - 2.65 KB
- [x] Main package files (index.*) - All present

### Exports Configuration
- [x] `package.json` exports field correctly configured
- [x] ESM imports work: `import { hashApiKey } from '@lanonasis/security-sdk/hash-utils'`
- [x] CommonJS imports work: `const { hashApiKey } = require('@lanonasis/security-sdk/hash-utils')`
- [x] TypeScript types resolve correctly

### Documentation
- [x] README.md updated with hash-utils usage examples
- [x] CHANGELOG.md updated with v1.0.3 changes
- [x] All functions documented with JSDoc comments

### Testing
- [x] Unit tests for all hash-utils functions (15 tests)
- [x] Integration test with main SecuritySDK (3 tests)
- [x] Manual import verification (ESM and CJS)

## 📦 Release Steps

1. **Final Build**
   ```bash
   npm run build
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Verify Package Contents**
   ```bash
   npm pack --dry-run
   ```

4. **Publish to NPM**
   ```bash
   npm publish
   ```

5. **Verify Published Package**
   ```bash
   npm view @lanonasis/security-sdk version
   npm install @lanonasis/security-sdk@1.0.3
   ```

## 🎯 Post-Release Tasks

1. Update monorepo packages to use `@lanonasis/security-sdk@^1.0.3`
2. Replace local hash-utils copies with package imports
3. Remove local hash-utils files from:
   - `apps/lanonasis-maas/shared/hash-utils.ts`
   - `apps/lanonasis-maas/cli/src/utils/hash-utils.ts`
   - `apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension/src/utils/hash-utils.ts`
   - `apps/lanonasis-maas/src/shared/hash-utils.ts`

## 📝 Migration Guide

### Before (Local Copy)
```typescript
import { hashApiKey } from '../../shared/hash-utils';
```

### After (Published Package)
```typescript
import { hashApiKey } from '@lanonasis/security-sdk/hash-utils';
```

### Benefits
- ✅ No more TypeScript rootDir issues
- ✅ Single source of truth
- ✅ Automatic updates via npm
- ✅ Better type safety
- ✅ Consistent across all projects
