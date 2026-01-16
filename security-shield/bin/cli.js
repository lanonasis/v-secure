#!/usr/bin/env node

/**
 * @lanonasis/security-shield CLI
 * 
 * Supports both Netlify and Vercel deployments
 * 
 * Usage:
 *   npx @lanonasis/security-shield init              # Auto-detect platform
 *   npx @lanonasis/security-shield init --netlify    # Force Netlify
 *   npx @lanonasis/security-shield init --vercel     # Force Vercel
 *   npx @lanonasis/security-shield check             # Audit security config
 *   npx @lanonasis/security-shield update            # Update security rules
 */

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// ============================================
// BANNER
// ============================================

const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('🛡️  LanOnasis Security Shield')}                            ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Edge security for Netlify & Vercel deployments')}           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

// ============================================
// UTILITIES
// ============================================

function log(message, type = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✔'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✖'),
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function detectPlatform(cwd) {
  // Check for Vercel
  if (fileExists(path.join(cwd, 'vercel.json'))) return 'vercel';
  if (fileExists(path.join(cwd, '.vercel'))) return 'vercel';
  
  // Check for Netlify
  if (fileExists(path.join(cwd, 'netlify.toml'))) return 'netlify';
  if (fileExists(path.join(cwd, '.netlify'))) return 'netlify';
  
  // Check package.json for hints
  const pkgPath = path.join(cwd, 'package.json');
  if (fileExists(pkgPath)) {
    const pkg = fs.readJsonSync(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps['@vercel/node'] || deps['@vercel/edge']) return 'vercel';
    if (deps['@netlify/functions'] || deps['@netlify/edge-functions']) return 'netlify';
    
    // Check for Next.js (often deployed to Vercel)
    if (deps['next']) return 'vercel';
  }
  
  return null;
}

function detectFramework(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fileExists(pkgPath)) return null;
  
  const pkg = fs.readJsonSync(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (deps['next']) return 'nextjs';
  if (deps['nuxt']) return 'nuxt';
  if (deps['@sveltejs/kit']) return 'sveltekit';
  if (deps['astro']) return 'astro';
  if (deps['remix']) return 'remix';
  if (deps['gatsby']) return 'gatsby';
  if (deps['vite'] && deps['react']) return 'vite-react';
  if (deps['vite'] && deps['vue']) return 'vite-vue';
  if (deps['vite']) return 'vite';
  
  return 'static';
}

async function copyTemplate(src, dest, options = {}) {
  if (!fileExists(src)) {
    throw new Error(`Template not found: ${src}`);
  }
  
  if (fileExists(dest) && !options.force) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: `${path.basename(dest)} already exists. Overwrite?`,
      default: false,
    }]);
    
    if (!overwrite) {
      log(`Skipped ${path.basename(dest)}`, 'warning');
      return false;
    }
  }
  
  await fs.copy(src, dest);
  return true;
}

// ============================================
// INIT COMMAND
// ============================================

async function initCommand(options) {
  console.log(banner);
  
  const cwd = process.cwd();
  
  let platform = options.netlify ? 'netlify' : options.vercel ? 'vercel' : detectPlatform(cwd);
  const framework = detectFramework(cwd);
  
  log(`Detected framework: ${chalk.cyan(framework || 'unknown')}`);
  
  if (!platform) {
    const { selectedPlatform } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedPlatform',
      message: 'Select your deployment platform:',
      choices: [
        { name: 'Vercel', value: 'vercel' },
        { name: 'Netlify', value: 'netlify' },
        { name: 'Both (multi-platform)', value: 'both' },
      ],
    }]);
    platform = selectedPlatform;
  } else {
    log(`Detected platform: ${chalk.cyan(platform)}`);
  }
  
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select security features:',
      choices: [
        { name: 'Middleware/Edge Function (bot detection, attack blocking)', value: 'middleware', checked: true },
        { name: 'Security Headers', value: 'headers', checked: true },
        { name: 'Rewrite Rules (block sensitive paths)', value: 'rewrites', checked: true },
        { name: 'robots.txt (block malicious crawlers)', value: 'robots', checked: true },
      ],
    },
    {
      type: 'checkbox',
      name: 'blockLists',
      message: 'Select what to block:',
      choices: [
        { name: 'AI Crawlers (GPTBot, ClaudeBot, etc.)', value: 'ai', checked: false },
        { name: 'SEO Bots (Semrush, Ahrefs, etc.)', value: 'seo', checked: true },
        { name: 'Security Scanners (Nikto, Nmap, etc.)', value: 'scanners', checked: true },
      ],
    },
  ]);
  
  const results = { created: [], skipped: [], errors: [] };
  
  try {
    // VERCEL SETUP
    if (platform === 'vercel' || platform === 'both') {
      log('\nSetting up Vercel security...', 'info');
      
      if (answers.features.includes('middleware')) {
        const middlewareDest = fileExists(path.join(cwd, 'src')) 
          ? path.join(cwd, 'src', 'middleware.ts')
          : path.join(cwd, 'middleware.ts');
        
        const copied = await copyTemplate(
          path.join(TEMPLATES_DIR, 'vercel', 'middleware.ts'),
          middlewareDest,
          { force: options.force }
        );
        if (copied) results.created.push(middlewareDest.replace(cwd + '/', ''));
        else results.skipped.push('middleware.ts');
      }
      
      if (answers.features.includes('headers') || answers.features.includes('rewrites')) {
        const vercelJsonPath = path.join(cwd, 'vercel.json');
        
        if (fileExists(vercelJsonPath)) {
          const existing = await fs.readJson(vercelJsonPath);
          const template = await fs.readJson(path.join(TEMPLATES_DIR, 'vercel', 'vercel.json'));
          
          existing.headers = [...(existing.headers || []), ...(template.headers || [])];
          existing.rewrites = [...(existing.rewrites || []), ...(template.rewrites || [])];
          
          await fs.writeJson(vercelJsonPath, existing, { spaces: 2 });
          results.created.push('vercel.json (merged)');
        } else {
          await copyTemplate(
            path.join(TEMPLATES_DIR, 'vercel', 'vercel.json'),
            vercelJsonPath,
            { force: options.force }
          );
          results.created.push('vercel.json');
        }
      }
      
      if (answers.features.includes('robots')) {
        const publicDir = path.join(cwd, 'public');
        await fs.ensureDir(publicDir);
        
        const copied = await copyTemplate(
          path.join(TEMPLATES_DIR, 'vercel', 'robots.txt'),
          path.join(publicDir, 'robots.txt'),
          { force: options.force }
        );
        if (copied) results.created.push('public/robots.txt');
        else results.skipped.push('public/robots.txt');
      }
    }
    
    // NETLIFY SETUP
    if (platform === 'netlify' || platform === 'both') {
      log('\nSetting up Netlify security...', 'info');
      
      if (answers.features.includes('middleware')) {
        const edgeFunctionsDir = path.join(cwd, 'netlify', 'edge-functions');
        await fs.ensureDir(edgeFunctionsDir);
        
        const copied = await copyTemplate(
          path.join(TEMPLATES_DIR, 'security-shield.ts'),
          path.join(edgeFunctionsDir, 'security-shield.ts'),
          { force: options.force }
        );
        if (copied) results.created.push('netlify/edge-functions/security-shield.ts');
        else results.skipped.push('netlify/edge-functions/security-shield.ts');
      }
      
      if (answers.features.includes('headers')) {
        const copied = await copyTemplate(
          path.join(TEMPLATES_DIR, '_headers'),
          path.join(cwd, '_headers'),
          { force: options.force }
        );
        if (copied) results.created.push('_headers');
        else results.skipped.push('_headers');
      }
      
      if (answers.features.includes('rewrites')) {
        const tomlPath = path.join(cwd, 'netlify.toml');
        
        if (fileExists(tomlPath)) {
          await copyTemplate(
            path.join(TEMPLATES_DIR, 'netlify-redirects.toml'),
            path.join(cwd, 'security-redirects.toml'),
            { force: true }
          );
          results.created.push('security-redirects.toml (merge with netlify.toml)');
        } else {
          await copyTemplate(
            path.join(TEMPLATES_DIR, 'netlify.toml'),
            tomlPath,
            { force: options.force }
          );
          results.created.push('netlify.toml');
        }
      }
      
      if (answers.features.includes('robots') && platform === 'netlify') {
        const publicDir = path.join(cwd, 'public');
        const robotsDest = fileExists(publicDir)
          ? path.join(publicDir, 'robots.txt')
          : path.join(cwd, 'robots.txt');
        
        const copied = await copyTemplate(
          path.join(TEMPLATES_DIR, 'robots.txt'),
          robotsDest,
          { force: options.force }
        );
        if (copied) results.created.push(robotsDest.replace(cwd + '/', ''));
        else results.skipped.push('robots.txt');
      }
    }
    
    // Save config
    const config = {
      version: '1.0.0',
      platform,
      framework,
      features: answers.features,
      blockLists: answers.blockLists,
      createdAt: new Date().toISOString(),
    };
    
    await fs.writeJson(path.join(cwd, 'security-shield.config.json'), config, { spaces: 2 });
    results.created.push('security-shield.config.json');
    
  } catch (error) {
    results.errors.push(error.message);
  }
  
  // Summary
  console.log('\n' + chalk.bold('📋 Summary:'));
  
  if (results.created.length > 0) {
    console.log(chalk.green('\nCreated:'));
    results.created.forEach(f => console.log(`  ${chalk.green('+')} ${f}`));
  }
  
  if (results.skipped.length > 0) {
    console.log(chalk.yellow('\nSkipped:'));
    results.skipped.forEach(f => console.log(`  ${chalk.yellow('-')} ${f}`));
  }
  
  // Next steps
  console.log('\n' + chalk.bold('🚀 Next Steps:'));
  
  if (platform === 'vercel' || platform === 'both') {
    console.log(`
  ${chalk.cyan('Vercel:')}
  • Deploy: ${chalk.gray('vercel --prod')} or push to Git
  • View logs: Vercel Dashboard → Logs
`);
  }
  
  if (platform === 'netlify' || platform === 'both') {
    console.log(`
  ${chalk.cyan('Netlify:')}
  • Install: ${chalk.gray('npm install @netlify/edge-functions -D')}
  • Deploy: ${chalk.gray('git push')} or ${chalk.gray('netlify deploy --prod')}
  • View logs: Netlify Dashboard → Edge Functions
`);
  }
  
  log('Security shield initialized!', 'success');
}

// ============================================
// CHECK COMMAND
// ============================================

async function checkCommand() {
  console.log(banner);
  
  const cwd = process.cwd();
  const platform = detectPlatform(cwd);
  
  log(`Platform: ${chalk.cyan(platform || 'unknown')}\n`);
  
  const checks = [];
  
  if (platform === 'vercel' || !platform) {
    checks.push({ name: 'Vercel Middleware', paths: ['middleware.ts', 'src/middleware.ts'] });
    checks.push({ name: 'vercel.json', path: 'vercel.json' });
  }
  
  if (platform === 'netlify' || !platform) {
    checks.push({ name: 'Netlify Edge Function', path: 'netlify/edge-functions/security-shield.ts' });
    checks.push({ name: '_headers', path: '_headers' });
    checks.push({ name: 'netlify.toml', path: 'netlify.toml' });
  }
  
  checks.push({ name: 'robots.txt', paths: ['public/robots.txt', 'robots.txt'] });
  checks.push({ name: 'Config File', path: 'security-shield.config.json' });
  
  let passed = 0, failed = 0;
  
  for (const check of checks) {
    const paths = check.paths || [check.path];
    const exists = paths.some(p => fileExists(path.join(cwd, p)));
    
    if (exists) {
      log(`${check.name}: ${chalk.green('Found')}`, 'success');
      passed++;
    } else {
      log(`${check.name}: ${chalk.red('Missing')}`, 'error');
      failed++;
    }
  }
  
  console.log(`\n  ${chalk.green(passed)} passed, ${chalk.red(failed)} missing`);
  
  if (failed > 0) {
    console.log(`\nRun ${chalk.cyan('npx @lanonasis/security-shield init')} to fix.`);
  }
}

// ============================================
// UPDATE COMMAND
// ============================================

async function updateCommand(options) {
  console.log(banner);
  log('Updating security rules...');
  
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'security-shield.config.json');
  
  if (!fileExists(configPath)) {
    log('No config found. Run init first.', 'error');
    return;
  }
  
  const config = await fs.readJson(configPath);
  
  if (config.platform === 'vercel' || config.platform === 'both') {
    const dest = fileExists(path.join(cwd, 'src')) 
      ? path.join(cwd, 'src', 'middleware.ts')
      : path.join(cwd, 'middleware.ts');
    
    if (fileExists(dest)) {
      await copyTemplate(path.join(TEMPLATES_DIR, 'vercel', 'middleware.ts'), dest, { force: true });
      log('Updated Vercel middleware', 'success');
    }
  }
  
  if (config.platform === 'netlify' || config.platform === 'both') {
    const dest = path.join(cwd, 'netlify', 'edge-functions', 'security-shield.ts');
    if (fileExists(dest)) {
      await copyTemplate(path.join(TEMPLATES_DIR, 'security-shield.ts'), dest, { force: true });
      log('Updated Netlify edge function', 'success');
    }
  }
  
  config.updatedAt = new Date().toISOString();
  await fs.writeJson(configPath, config, { spaces: 2 });
  
  log('Done! Deploy to apply changes.', 'success');
}

// ============================================
// CLI
// ============================================

program
  .name('security-shield')
  .description('LanOnasis Security Shield - Edge security for Netlify & Vercel')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize security shield')
  .option('-f, --force', 'Overwrite existing files')
  .option('--netlify', 'Force Netlify setup')
  .option('--vercel', 'Force Vercel setup')
  .action(initCommand);

program
  .command('check')
  .description('Audit security configuration')
  .action(checkCommand);

program
  .command('update')
  .description('Update security rules')
  .option('-f, --force', 'Force update')
  .action(updateCommand);

program.parse();
