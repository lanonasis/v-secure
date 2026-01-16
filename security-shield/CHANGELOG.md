# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-16

### Added
- Initial release
- **Edge Security** for Netlify and Vercel deployments
- **Bot Protection**: Block malicious user agents (scrapers, scanners, exploit tools)
- **Path Blocking**: Protect sensitive files (.env, .git, wp-config, etc.)
- **Honeypot Traps**: Catch attackers probing common vulnerability paths
- **Attack Pattern Detection**: SQL injection, XSS, path traversal
- **Security Headers**: Auto-add X-Frame-Options, CSP, HSTS
- **CLI Tool**: `npx @lanonasis/security-shield init`
  - Auto-detect Netlify or Vercel
  - Copy configuration templates
  - Interactive setup wizard
- **Presets**: minimal, standard, maxSecurity configurations
- **Templates**:
  - Netlify: `netlify.toml`, `_headers`, edge function
  - Vercel: `vercel.json`, `middleware.ts`
- **Customizable**: Add custom blocked paths, user agents, exclusions
- **Logging**: JSON-formatted security event logs
