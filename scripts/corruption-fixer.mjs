#!/usr/bin/env node

/**
 * Environment Configuration Corruption Fixer (Hardened)
 *
 * Safely fixes corruption patterns reported by scan-env-corruption.mjs.
 * - Uses report schema from scan-env-corruption.mjs (detailedResults[].corruptions)
 * - Applies targeted, line-level fixes with context awareness
 * - Creates backups before mutating files
 * - Supports dry-run / backup / fix modes
 * - Optional lightweight syntax validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DUMMY_DEFAULTS = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_AUTH_URL: 'https://test.supabase.co/auth/v1',
  SUPABASE_ANON_KEY: 'test-supabase-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-supabase-service-role-key',
  SUPABASE_SERVICE_KEY: 'test-supabase-service-role-key',
  SUPABASE_SERVICE_ROLE: 'test-supabase-service-role-key',
  SUPABASE_KEY: 'test-supabase-service-role-key',
  SUPABASE_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  DIRECT_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  SERVICE_ROLE_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEON_DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'test-jwt-secret-32-characters-long-0000',
  OPENAI_API_KEY: 'test-openai-key',
  WEBHOOK_SECRET: 'test-webhook-secret',
  REDIS_URL: 'redis://localhost:6379',
};

const ZOD_RULES = {
  SUPABASE_URL: "z.string().url()",
  SUPABASE_AUTH_URL: "z.string().url()",
  JWT_SECRET: "z.string().min(32)",
};

const PLACEHOLDER_REGEX = {
  supabaseUrl: /https:\/\/<project-ref>\.supabase\.co/g,
  pgUrl: /postgresql:\/\/<[^>]+>/g,
  redactedEnv: /([A-Z_][A-Z0-9_]+)=REDACTED_[A-Z0-9_]+/g,
  envAssignment: /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(REDACTED_[A-Z0-9_]+|https:\/\/<project-ref>\.supabase\.co|postgresql:\/\/<[^>]+>)\s*$/,
  processEnvAssignment: /(process\.env)\.([A-Z_][A-Z0-9_]*)\s*=\s*([^\n;]+)/g,
  envObjectAssignment: /(\benv)\.([A-Z_][A-Z0-9_]*)\s*=\s*([^\n;]+)/g,
  processEnvInlineAssignment: /(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*process\.env\.([A-Z_][A-Z0-9_]*)\s*=\s*([^\n;]+)/g,
  constSupabasePlaceholder: /(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*https:\/\/<project-ref>\.supabase\.co\b/g,
  constPgPlaceholder: /(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*postgresql:\/\/<[^>]+>/g,
  denoEnvGetPlaceholder: /Deno\.env\.get\(['"]([A-Z_][A-Z0-9_]*)=[^'\"]*['"]\)/g,
  stringifiedPlaceholder: /([A-Z_][A-Z0-9_]+)=(https:\/\/<project-ref>\.supabase\.co|postgresql:\/\/<[^>]+>|REDACTED_[A-Z0-9_]+)/g,
};

function parseArgs(argv) {
  const args = {
    report: '',
    mode: 'dry-run', // dry-run, fix, backup
    validate: false,
    backup: '',
    include: '',
    exclude: ''
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--report':
        args.report = argv[++i];
        break;
      case '--mode':
        args.mode = argv[++i];
        break;
      case '--validate':
        args.validate = true;
        break;
      case '--backup':
        args.backup = argv[++i] || '';
        break;
      case '--include':
        args.include = argv[++i] || '';
        break;
      case '--exclude':
        args.exclude = argv[++i] || '';
        break;
    }
  }

  if (!args.report) {
    throw new Error('Missing required argument: --report');
  }

  return args;
}

function resolveReportPath(reportArg) {
  if (!reportArg.includes('*')) return reportArg;

  const dir = path.dirname(reportArg);
  const base = path.basename(reportArg);
  const regex = new RegExp('^' + base.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');

  if (!fs.existsSync(dir)) {
    throw new Error(`Report directory not found: ${dir}`);
  }

  const candidates = fs.readdirSync(dir)
    .filter(file => regex.test(file))
    .map(file => path.join(dir, file));

  if (candidates.length === 0) {
    throw new Error(`No reports matched pattern: ${reportArg}`);
  }

  candidates.sort((a, b) => {
    const aStat = fs.statSync(a);
    const bStat = fs.statSync(b);
    return bStat.mtimeMs - aStat.mtimeMs;
  });

  return candidates[0];
}

function createBackup(filePath, backupDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(filePath)}-${timestamp}.bak`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function isTestFile(filePath) {
  return (
    filePath.includes('__tests__') ||
    filePath.includes('.test.') ||
    filePath.includes('/tests/') ||
    filePath.includes('test-')
  );
}

function isEnvFile(filePath) {
  const base = path.basename(filePath);
  return base === '.env' || base === '.env.example' || base.startsWith('.env.') ||
    base === 'env.ts' || base === 'env.js' || base === 'environment.ts' || base === 'environment.js';
}

function isZodFile(filePath, content) {
  return filePath.includes('environment.') || filePath.includes('config.') || content.includes('z.object(');
}

function isConfigLike(filePath, content) {
  return filePath.includes('config.') || filePath.includes('setup.') || content.includes('process.env');
}

function shouldInclude(filePath, include, exclude) {
  if (exclude) {
    const excludes = exclude.split(',').map(s => s.trim()).filter(Boolean);
    if (excludes.some(ex => filePath.includes(ex))) return false;
  }

  if (include) {
    const includes = include.split(',').map(s => s.trim()).filter(Boolean);
    return includes.some(inc => filePath.includes(inc));
  }

  return true;
}

function dummyFor(key) {
  return DUMMY_DEFAULTS[key] || DUMMY_DEFAULTS[key.replace(/^VITE_/, '')] || DUMMY_DEFAULTS[key.replace(/^NEXT_PUBLIC_/, '')] || '';
}

function zodFor(key) {
  return ZOD_RULES[key] || 'z.string().min(1)';
}

function fixEnvAssignmentLine(line, context) {
  const match = line.match(PLACEHOLDER_REGEX.envAssignment);
  if (!match) return { line, changed: false, reason: null };

  const key = match[1];
  const indent = line.match(/^\s*/)?.[0] || '';

  if (context.isEnvFile) {
    const value = dummyFor(key) || match[2];
    return { line: `${indent}${key}=${value}`, changed: true, reason: 'env-assignment' };
  }

  if (context.isZod) {
    return { line: `${indent}${key}: ${zodFor(key)},`, changed: true, reason: 'zod-schema' };
  }

  if (context.isTest) {
    const value = dummyFor(key) || match[2];
    return { line: `${indent}process.env.${key} = '${value}'`, changed: true, reason: 'test-env' };
  }

  // fallback: just strip placeholder value in string lists
  return { line: line.replace(PLACEHOLDER_REGEX.stringifiedPlaceholder, '$1'), changed: true, reason: 'stringified-placeholder' };
}

function fixLine(line, context) {
  let out = line;
  let changed = false;
  let reason = null;

  const envFix = fixEnvAssignmentLine(out, context);
  if (envFix.changed) {
    return envFix;
  }

  // Fix Deno.env.get('VAR=...')
  out = out.replace(PLACEHOLDER_REGEX.denoEnvGetPlaceholder, (_, varName) => `Deno.env.get('${varName}')`);
  if (out !== line) {
    return { line: out, changed: true, reason: 'deno-env-get' };
  }

  // Fix process.env.X
  out = out.replace(PLACEHOLDER_REGEX.processEnvAssignment, (full, obj, key) => {
    if (context.isTest) {
      const value = dummyFor(key) || 'REPLACE_ME';
      return `${obj}.${key} = '${value}'`;
    }
    return `${obj}.${key}`;
  });

  if (out !== line) {
    return { line: out, changed: true, reason: 'process-env-assignment' };
  }

  // Fix env.X=<placeholder>
  out = out.replace(PLACEHOLDER_REGEX.envObjectAssignment, (full, obj, key) => {
    if (context.isTest) {
      const value = dummyFor(key) || 'REPLACE_ME';
      return `${obj}.${key} = '${value}'`;
    }
    return `${obj}.${key}`;
  });

  if (out !== line) {
    return { line: out, changed: true, reason: 'env-object-assignment' };
  }

  // Fix inline process.env assignment: const X = process.env.Y
  out = out.replace(PLACEHOLDER_REGEX.processEnvInlineAssignment, (full, decl, localName, envKey) => {
    return `${decl} ${localName} = process.env.${envKey}`;
  });

  if (out !== line) {
    return { line: out, changed: true, reason: 'inline-process-env' };
  }

  // Fix const SUPABASE_URL = https://<project-ref>.supabase.co
  out = out.replace(PLACEHOLDER_REGEX.constSupabasePlaceholder, (full, decl, localName) => {
    return `${decl} ${localName} = process.env.SUPABASE_URL || ''`;
  });

  if (out !== line) {
    return { line: out, changed: true, reason: 'const-supabase-placeholder' };
  }

  // Fix const X = postgresql://<...>
  out = out.replace(PLACEHOLDER_REGEX.constPgPlaceholder, (full, decl, localName) => {
    const envKey = localName.toUpperCase().includes('DIRECT')
      ? 'DIRECT_DATABASE_URL'
      : localName.toUpperCase().includes('SERVICE_ROLE')
        ? 'SERVICE_ROLE_DATABASE_URL'
        : localName.toUpperCase().includes('NEON')
          ? 'NEON_DATABASE_URL'
          : 'DATABASE_URL';
    return `${decl} ${localName} = process.env.${envKey} || ''`;
  });

  if (out !== line) {
    return { line: out, changed: true, reason: 'const-pg-placeholder' };
  }

  // Fix stringified placeholders in error messages or arrays
  out = out.replace(PLACEHOLDER_REGEX.stringifiedPlaceholder, '$1');

  if (out !== line) {
    return { line: out, changed: true, reason: 'stringified-placeholder' };
  }

  // Standalone placeholder lines
  if (out.trim() === 'https://<project-ref>.supabase.co') {
    if (context.isEnvFile || context.isTest) {
      const value = dummyFor('SUPABASE_URL');
      return { line: `${context.indent}${value}`, changed: true, reason: 'standalone-supabase-url' };
    }
    if (context.isZod) {
      return { line: `${context.indent}SUPABASE_URL: ${zodFor('SUPABASE_URL')},`, changed: true, reason: 'standalone-supabase-zod' };
    }
  }

  if (out.trim().startsWith('postgresql://<')) {
    if (context.isEnvFile || context.isTest) {
      const value = dummyFor('DATABASE_URL');
      return { line: `${context.indent}${value}`, changed: true, reason: 'standalone-pg' };
    }
    if (context.isZod) {
      return { line: `${context.indent}DATABASE_URL: z.string().url(),`, changed: true, reason: 'standalone-pg-zod' };
    }
  }

  return { line, changed: false, reason };
}

function validateSyntax(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      execSync(`node --check ${JSON.stringify(filePath)}`, { stdio: 'pipe' });
      return true;
    }
    if (ext === '.ts' || ext === '.tsx') {
      // Syntax-only transpile; avoids module resolution issues
      const script = `const ts=require('typescript');const fs=require('fs');const src=fs.readFileSync(${JSON.stringify(filePath)},'utf8');ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}});`;
      execSync(`node -e ${JSON.stringify(script)}`, { stdio: 'pipe' });
      return true;
    }
  } catch (_err) {
    return false;
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv);
  const reportPath = resolveReportPath(args.report);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const fixReport = {
    timestamp: new Date().toISOString(),
    report: reportPath,
    mode: args.mode,
    files: [],
    stats: {
      totalFiles: 0,
      filesFixed: 0,
      totalFixes: 0,
      validationErrors: 0
    }
  };

  const backupDir = args.backup
    ? path.resolve(args.backup)
    : path.join(__dirname, 'backups', `corruption-fix-${new Date().toISOString().replace(/[:.]/g, '-')}`);

  const results = report.detailedResults || [];

  for (const file of results) {
    const filePath = file.filePath;
    if (!shouldInclude(filePath, args.include, args.exclude)) continue;

    const fileInfo = {
      path: filePath,
      originalCorruptions: file.totalCorruptions ?? (file.corruptions?.length || 0),
      appliedFixes: 0,
      changes: [],
      backupPath: '',
      validationPassed: false
    };

    fixReport.stats.totalFiles++;

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const context = {
        isTest: isTestFile(filePath),
        isEnvFile: isEnvFile(filePath),
        isZod: isZodFile(filePath, content),
        isConfig: isConfigLike(filePath, content),
        indent: ''
      };

      if (args.mode === 'backup') {
        fileInfo.backupPath = createBackup(filePath, backupDir);
        fixReport.files.push(fileInfo);
        continue;
      }

      const corruptions = file.corruptions || [];
      const lineEdits = new Map();

      for (const corruption of corruptions) {
        const lineIndex = Math.max(0, (corruption.lineNumber || 1) - 1);
        const originalLine = lines[lineIndex] ?? '';
        context.indent = originalLine.match(/^\s*/)?.[0] || '';

        const { line: fixedLine, changed, reason } = fixLine(originalLine, context);
        if (changed) {
          lineEdits.set(lineIndex, fixedLine);
          fileInfo.changes.push({
            line: lineIndex + 1,
            reason: reason || corruption.pattern,
            before: originalLine,
            after: fixedLine
          });
        }
      }

      if (lineEdits.size > 0) {
        for (const [index, newLine] of lineEdits.entries()) {
          lines[index] = newLine;
        }

        const fixedContent = lines.join('\n');
        fileInfo.appliedFixes = lineEdits.size;

        if (args.mode === 'fix') {
          fileInfo.backupPath = createBackup(filePath, backupDir);
          fs.writeFileSync(filePath, fixedContent, 'utf8');

          if (args.validate) {
            fileInfo.validationPassed = validateSyntax(filePath);
            if (!fileInfo.validationPassed) fixReport.stats.validationErrors++;
          }
        }

        fixReport.stats.filesFixed++;
        fixReport.stats.totalFixes += fileInfo.appliedFixes;
      }

      fixReport.files.push(fileInfo);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      fileInfo.error = error.message;
      fixReport.files.push(fileInfo);
    }
  }

  const reportDir = path.join(__dirname, 'corruption-fix-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportOut = path.join(reportDir, `fix-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportOut, JSON.stringify(fixReport, null, 2));

  console.log('='.repeat(80));
  console.log('✅ CORRUPTION FIXING COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Files processed: ${fixReport.stats.totalFiles}`);
  console.log(`🔧 Files fixed: ${fixReport.stats.filesFixed}`);
  console.log(`⚙️  Total fixes applied: ${fixReport.stats.totalFixes}`);

  if (args.validate) {
    console.log(`❌ Validation errors: ${fixReport.stats.validationErrors}`);
  }

  console.log(`📝 Fix report: ${reportOut}`);

  if (args.mode === 'fix') {
    console.log(`💾 Backups location: ${backupDir}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('❌ Fixing failed:', err.message);
    process.exit(1);
  });
}

export default { fixLine, validateSyntax };
