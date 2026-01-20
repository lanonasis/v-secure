import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/browser.ts',
    'src/react/index.ts',
    'src/server/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  platform: 'neutral',
  external: [
    'electron',
    'ws',
    'eventsource',
    'keytar',
    'open',
    'fs',
    'path',
    'os',
    'crypto',
    'react'  // React should be external (provided by consumer)
  ],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs'
    };
  }
});
