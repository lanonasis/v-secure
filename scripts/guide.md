# Environment Corruption Remediation Guide

## Purpose
This folder hosts the hardened scanner and fixer used to detect and repair placeholder corruption (REDACTED values, Supabase templates, PostgreSQL templates, and bad env assignments) across the Lanonasis codebase.

## Scripts
- `improved_corruption_scanner.mjs`: Read-only scanner. Supports `--roots`, `--patterns`, `--depth`, `--context`, `--max-size`, `--json`.
- `corruption-fixer.mjs`: Targeted fixer that applies line-level repairs from a `scan-env-corruption.mjs` report. Supports `--mode` (`dry-run`, `backup`, `fix`), `--validate`, `--include`, `--exclude`.

## What Was Fixed In Current Repos (Operational)
- `onasis-core/services/auth-gateway`: Restored env schemas and config files, removed placeholder assignments in runtime/test code, kept TS/JS env files aligned.
- `onasis-core/services/security`: Repaired env schema and test defaults, corrected runtime env usage.
- `mcp-core`: Repaired test env defaults and auth handler mocks; type-check now passes.
- `v-secure`: Repaired environment config and examples.
- `lanonasis-maas`: Restored environment schema entries for Supabase/JWT/OpenAI keys.

## Status And Known Follow-ups
- Expand cleanup to any out-of-scope directories if needed (server/scripts/build artifacts).
- Triage remaining TypeScript parse errors in `lanonasis-maas`.
- Resolve `onasis-core/services/security` type-check failures related to SecretService packaging.

## Recommended Workflow
- Run `node /opt/lanonasis/scripts/improved_corruption_scanner.mjs --roots /opt/lanonasis --context 2 --json /opt/lanonasis/corruption-summary.json`.
- Run `node /opt/lanonasis/scripts/scan-env-corruption.mjs` for the canonical scan.
- Use `corruption-fixer.mjs` with `--mode backup`, then `--mode dry-run`, then `--mode fix --validate`.
- Review diffs after each fix run and keep TS/JS pairs in sync.

## Notes
- The improved scanner now avoids false positives from comparison expressions (`process.env.X === 'value'`).
- `summary.scannedFiles` now reflects actual scanned files rather than only matched files.
