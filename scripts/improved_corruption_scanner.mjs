#!/usr/bin/env node

/**
 * Improved Environment Configuration Corruption Scanner
 *
 * This script crawls one or more directory trees looking for configuration
 * files that contain templated or placeholder values which were left
 * behind after stripping secrets from the repository history.
 *
 * It is designed to be flexible and safe: you can specify the search
 * roots, adjust which file globs are considered, include context lines
 * around each match and write the results to a JSON report. Pattern
 * definitions mirror those from the legacy scanner but can be extended
 * easily.
 *
 * Usage examples:
 *   node improved_corruption_scanner.js --roots ./repo1 ./repo2 --json report.json
 *   node improved_corruption_scanner.js --depth 3 --context 2
 */

import { promises as fs } from 'fs';
import { lstatSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Determine __dirname for ESM execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * File name patterns to scan. Globs are converted to regular expressions
 * via globToRegex. These defaults mirror the original scanner but you can
 * override them via command line if needed.
 */
const DEFAULT_FILE_PATTERNS = [
  'env.js',
  'env.ts',
  'environment.ts',
  'environment.js',
  'config.js',
  'config.ts',
  'setup.ts',
  '*.test.ts',
  '*.test.js',
  'utils.ts',
  'constants.ts'
];

/**
 * Corruption patterns to detect. Each entry contains a name, regex, severity
 * and description. If you need to add more patterns, extend this array.
 */
const CORRUPTION_PATTERNS = [
  {
    name: 'Raw PostgreSQL Connection String',
    pattern: /postgresql:\/\/<[^>]+>/g,
    severity: 'critical',
    description: 'Raw connection string template in code instead of proper schema property'
  },
  {
    name: 'Environment Variable Assignment as Code',
    // Match assignments like FOO=REDACTED_BAR at the beginning of a line
    pattern: /^[ \t]*[A-Z_][A-Z0-9_]*=REDACTED_[A-Z_]+/gm,
    severity: 'critical',
    description: 'Environment variable assignment syntax in wrong context'
  },
  {
    name: 'Supabase URL Template',
    pattern: /https:\/\/<project-ref>\.supabase\.co/g,
    severity: 'high',
    description: 'Supabase URL template as literal code'
  },
  {
    name: 'Process.env Assignment Without Quotes',
    // Detect process.env.X = <literal> without quotes, exclude comparisons and common non-string literals
    pattern: /process\.env\.[A-Z_][A-Z0-9_]*\s*=(?!\s*=)\s*(?!['"])(?!process\.env\.)(?!\btrue\b|\bfalse\b|\bundefined\b|\bnull\b)([^\n;]+)/g,
    severity: 'high',
    description: 'process.env assignment missing quotes around value (assignment only)'
  },
  {
    name: 'API Key Assignment Corruption',
    pattern: /OPENAI_API_KEY=REDACTED_OPENAI_API_KEY/g,
    severity: 'high',
    description: 'API key assignment in wrong context'
  },
  {
    name: 'JWT Secret Assignment Corruption',
    pattern: /JWT_SECRET=REDACTED_JWT_SECRET/g,
    severity: 'high',
    description: 'JWT secret assignment in wrong context'
  },
  {
    name: 'Supabase Key Assignment',
    pattern: /REDACTED_SUPABASE_[A-Z_]+/g,
    severity: 'high',
    description: 'Supabase key assignment in wrong context'
  }
];

/**
 * Convert a glob pattern into a regular expression. This escapes literal
 * regex metacharacters before replacing '*' with '.*'. It anchors the
 * pattern to match the entire filename.
 * @param {string} glob File glob pattern
 * @returns {RegExp} Regular expression
 */
function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexStr);
}

/**
 * Build a set of compiled regex patterns for file matching based on
 * provided patterns. Patterns containing asterisks are converted via
 * globToRegex while literal names are matched exactly.
 * @param {string[]} patterns
 */
function compileFilePatterns(patterns) {
  return patterns.map(p => {
    if (p.includes('*')) {
      return globToRegex(p);
    }
    return new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&') + '$');
  });
}

/**
 * Determine whether a filename should be scanned based on compiled regexes.
 * @param {string} filePath Absolute or relative file path
 * @param {RegExp[]} fileRegexes
 */
function shouldScanFile(filePath, fileRegexes) {
  const fileName = filePath.split('/').pop();
  return fileRegexes.some(regex => regex.test(fileName));
}

/**
 * Read a file and extract corruption matches along with optional context lines.
 * @param {string} filePath Path to the file
 * @param {number} context Number of context lines before and after
 */
async function scanFile(filePath, context = 0) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches = [];

  for (const pattern of CORRUPTION_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.pattern.lastIndex = 0;
    let match;
    // Use exec to capture index; for multiline patterns this will run across lines
    while ((match = pattern.pattern.exec(content)) !== null) {
      // Compute line number by counting newline characters up to match index
      const before = content.slice(0, match.index);
      const lineNumber = before.split(/\r?\n/).length;
      const ctx = [];
      if (context > 0) {
        const start = Math.max(0, lineNumber - 1 - context);
        const end = Math.min(lines.length - 1, lineNumber - 1 + context);
        for (let i = start; i <= end; i++) {
          ctx.push({ lineNumber: i + 1, text: lines[i] });
        }
      }
      matches.push({
        lineNumber,
        pattern: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        match: match[0],
        context: ctx
      });
    }
  }
  return matches;
}

/**
 * Recursively scan directories for files matching provided patterns. Uses
 * lstatSync to avoid following symlinks. Skips hidden directories and
 * common noisy directories like node_modules, dist, build, .git, coverage.
 *
 * @param {string} dir Root directory to scan
 * @param {Object} options
 * @param {RegExp[]} options.fileRegexes Compiled file regexes
 * @param {number} options.maxDepth Maximum directory depth
 * @param {number} options.currentDepth Current depth (internal)
 * @param {number} options.context Context lines
 * @param {number} options.maxSize File size limit (bytes)
 * @returns {Promise<{ results: { filePath: string, matches: any[] }[], scannedFiles: number }>}
 */
async function scanDirectory(dir, options, currentDepth = 0) {
  const results = [];
  let scannedFiles = 0;
  if (currentDepth > options.maxDepth) return { results, scannedFiles };
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`Warning: Could not read directory ${dir}: ${err.message}`);
    return { results, scannedFiles };
  }
  for (const entry of entries) {
    const name = entry.name;
    const fullPath = join(dir, name);
    // Skip hidden directories and files
    if (name.startsWith('.')) continue;
    // Skip some common build or dependency directories
    if (entry.isDirectory() && ['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage', '.cache'].includes(name)) {
      continue;
    }
    let stat;
    try {
      stat = lstatSync(fullPath);
    } catch (err) {
      console.warn(`Warning: Could not stat ${fullPath}: ${err.message}`);
      continue;
    }
    if (stat.isSymbolicLink()) {
      continue;
    }
    if (stat.isDirectory()) {
      const sub = await scanDirectory(fullPath, options, currentDepth + 1);
      results.push(...sub.results);
      scannedFiles += sub.scannedFiles;
    } else if (stat.isFile()) {
      if (!shouldScanFile(fullPath, options.fileRegexes)) continue;
      if (options.maxSize && stat.size > options.maxSize) continue;
      scannedFiles += 1;
      const matches = await scanFile(fullPath, options.context);
      if (matches.length > 0) {
        results.push({ filePath: fullPath, matches });
      }
    }
  }
  return { results, scannedFiles };
}

/**
 * Build an aggregated report from scan results.
 * @param {Array<{ filePath: string, matches: any[] }>} results
 * @param {number} scannedFiles
 */
function buildReport(results, scannedFiles = results.length) {
  const summary = {
    scannedFiles,
    totalCorruptions: 0,
    corruptedFiles: 0,
    timestamp: new Date().toISOString()
  };
  const severityBreakdown = {};
  const filesByPattern = {};
  for (const file of results) {
    const count = file.matches.length;
    summary.totalCorruptions += count;
    if (count > 0) summary.corruptedFiles++;
    for (const match of file.matches) {
      severityBreakdown[match.severity] = (severityBreakdown[match.severity] || 0) + 1;
      if (!filesByPattern[match.pattern]) filesByPattern[match.pattern] = [];
      filesByPattern[match.pattern].push({ file: file.filePath, line: match.lineNumber, severity: match.severity });
    }
  }
  return { summary, severityBreakdown, filesByPattern, detailedResults: results };
}

/**
 * Pretty-print a report to the console. Context lines, if present, are
 * displayed indented beneath each match.
 * @param {ReturnType<typeof buildReport>} report
 */
function printReport(report) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ENVIRONMENT CONFIGURATION CORRUPTION SCAN REPORT');
  console.log('='.repeat(80));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Files Scanned: ${report.summary.scannedFiles}`);
  console.log(`   Files with Corruption: ${report.summary.corruptedFiles}`);
  console.log(`   Total Corruption Instances: ${report.summary.totalCorruptions}`);
  console.log(`   Scan Time: ${report.summary.timestamp}`);
  console.log(`\n🚨 SEVERITY BREAKDOWN:`);
  Object.entries(report.severityBreakdown).forEach(([severity, count]) => {
    const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : '🟡';
    console.log(`   ${icon} ${severity.toUpperCase()}: ${count} instances`);
  });
  console.log(`\n📋 CORRUPTION PATTERNS FOUND:`);
  Object.entries(report.filesByPattern).forEach(([pattern, files]) => {
    console.log(`\n   ${pattern} (${files.length} occurrences):`);
    files.slice(0, 5).forEach(file => {
      console.log(`      • ${file.file}:${file.line} (${file.severity})`);
    });
    if (files.length > 5) {
      console.log(`      ... and ${files.length - 5} more`);
    }
  });
  if (report.detailedResults.length > 0) {
    console.log(`\n📁 DETAILED FILE ANALYSIS:`);
    for (const file of report.detailedResults) {
      console.log(`\n   📄 ${file.filePath} (${file.matches.length} corruptions):`);
      for (const match of file.matches) {
        const icon = match.severity === 'critical' ? '🔴' : '🟠';
        console.log(`      ${icon} Line ${match.lineNumber}: ${match.pattern}`);
        console.log(`         ${match.description}`);
        console.log(`         Match: ${match.match}`);
        if (match.context && match.context.length > 0) {
          console.log('         Context:');
          for (const ctx of match.context) {
            console.log(`           ${ctx.lineNumber.toString().padStart(4, ' ')} | ${ctx.text}`);
          }
        }
      }
    }
  }
  console.log('\n' + '='.repeat(80));
  console.log('✅ SCAN COMPLETE');
  console.log('='.repeat(80));
}

/**
 * Parse command-line arguments. Accepts the following flags:
 * --roots <dir...>     One or more root directories to scan (default: current working directory)
 * --patterns <glob...> File glob patterns to include (defaults to known config patterns)
 * --depth <n>          Maximum directory depth to scan (default: 4)
 * --context <n>        Number of context lines before/after each match (default: 0)
 * --max-size <bytes>   Skip files larger than this many bytes (default: 1048576 = 1MB)
 * --json <path>        Write the report to a JSON file instead of printing context snippets
 */
function parseArgs(argv) {
  const args = {
    roots: [],
    patterns: DEFAULT_FILE_PATTERNS,
    depth: 4,
    context: 0,
    maxSize: 1024 * 1024,
    json: null
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--roots':
        args.roots = [];
        while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
          args.roots.push(argv[++i]);
        }
        break;
      case '--patterns':
        args.patterns = [];
        while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
          args.patterns.push(argv[++i]);
        }
        break;
      case '--depth':
        args.depth = parseInt(argv[++i], 10);
        break;
      case '--context':
        args.context = parseInt(argv[++i], 10);
        break;
      case '--max-size':
        args.maxSize = parseInt(argv[++i], 10);
        break;
      case '--json':
        args.json = argv[++i];
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }
  if (args.roots.length === 0) {
    args.roots.push(process.cwd());
  }
  return args;
}

async function main() {
  const opts = parseArgs(process.argv);
  const fileRegexes = compileFilePatterns(opts.patterns);
  const allResults = [];
  let totalScanned = 0;
  for (const root of opts.roots) {
    const absRoot = root.startsWith('/') ? root : join(process.cwd(), root);
    const res = await scanDirectory(absRoot, {
      fileRegexes,
      maxDepth: opts.depth,
      context: opts.context,
      maxSize: opts.maxSize
    });
    allResults.push(...res.results);
    totalScanned += res.scannedFiles;
  }
  const report = buildReport(allResults, totalScanned);
  if (opts.json) {
    await fs.writeFile(opts.json, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report written to ${opts.json}`);
  }
  printReport(report);
}

// Execute if run directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

export default { scanDirectory, scanFile, buildReport, printReport };
