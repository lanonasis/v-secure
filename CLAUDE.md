# v-secure

Security/compliance platform (`@lanonasis/security-service`). Canonical source for `privacy-sdk`, `security-sdk`, and `oauth-client` — those root packages are synced mirrors, not independent implementations (see `scripts/sync-security-packages.md`).

## Commands (run from this directory)

- `bun run dev` / `start`
- `bun run test` — `test:packages`, `test:watch`, `test:coverage` for targeted runs
- `bun run lint` / `lint:fix`
- `bun run type-check`
- `bun run migrate`

## Notes

- Changes to compliance-manager, vendor-abstraction, or version-manager logic here must follow the matching guardian skill (`.claude/skills/compliance-manager`, `vendor-abstraction`, `version-manager`).
- Sync direction with root packages is per-package — diff both sides before resyncing, don't assume monorepo is always authoritative for every package.
