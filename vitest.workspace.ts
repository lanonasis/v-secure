import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './web/vitest.config.ts',
  './oauth-client/vitest.config.ts',
  './security-sdk/vitest.config.ts',
]);
