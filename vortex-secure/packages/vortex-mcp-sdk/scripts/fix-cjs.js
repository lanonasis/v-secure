#!/usr/bin/env node
// Script to add package.json to CJS dist for proper module resolution

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjsDir = join(__dirname, '..', 'dist', 'cjs');

// Add package.json to mark this directory as CommonJS
writeFileSync(
  join(cjsDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
);

console.log('Added package.json to CJS dist directory');
