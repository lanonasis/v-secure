import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Next 16 removed the `next lint` command; ESLint now runs directly with a
// flat config. This mirrors the legacy .eslintrc.json (next/core-web-vitals
// + next/typescript) that `next lint` used to apply.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/**',
    'test/**',
  ]),
]);
