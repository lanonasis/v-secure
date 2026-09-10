# TestSprite integration for v-secure

Status: diagnostic record for [issue #132](https://github.com/lanonasis/v-secure/issues/132).
Scope: documents where the TestSprite GitHub App configuration lives, why the
`TestSprite Pre-Check` status fails with `No tests detected`, how the v-secure
package/test layout maps to (and mostly does **not** map to) TestSprite, and the
operator actions required to change the status behavior.

This document is intentionally diagnostic. No code path in this repository can
change the `TestSprite Pre-Check` status on its own, because that status is
produced by the TestSprite **GitHub App**, whose configuration is managed in the
TestSprite **Web Portal** (outside this repository). See
[Where the configuration lives](#2-where-the-configuration-lives).

---

## 1. What the failing status is

`TestSprite Pre-Check` is a **GitHub commit status** (Status API context), not a
workflow check-run and not a repository-native CI job.

Observed on evidence PR #131 (`test(oauth-client): cover keytar fallback paths`,
merged as `219b7bc`, head `aa49522`):

```text
context:     TestSprite Pre-Check
state:       failure
description: No tests detected
target_url:  (none)
```

- No `.github/workflows/*` file in this repository posts that context. The only
  workflows are `ci.yml`, `codeql.yml`, `publish-packages.yml`, `riskgpt.yml`.
- All first-party gates on the same PR passed: lint (root/web/vortex), type
  check, build, `Test` (the vitest/jest package suite), CodeQL, dependency
  review, security audit, Vercel/Netlify previews. See issue #132 for the full
  listing.

`target_url` is empty because TestSprite posts the status before any run exists
to link to: the "Pre-Check" fires, finds nothing in scope, and reports failure.

## 2. Where the configuration lives

TestSprite is wired to this repository through the TestSprite **GitHub App**
(installed on the `lanonasis` GitHub organization). Per the TestSprite
documentation the GitHub App mode is a **"no-config integration"**:

- Connection of the repository, and the three per-repository toggles
  (**Run on Pull Requests**, **Include Draft PRs**, **Blocking PRs**), are set
  in the TestSprite Web Portal under **Settings → GitHub App → Connected
  Repository**.
- The GitHub App **runs tests that already exist**; it does not generate them
  and it does not execute the repository's own test runner (vitest/jest).
  Repo-side artifacts that a project can carry are a `.testsprite/config.json`
  (holding a TestSprite `projectId`) and/or a committed `testsprite_tests/`
  folder of TestSprite UI/API specs.

This repository currently carries **none** of the repo-side artifacts:

- No `.testsprite/config.json` in the v-secure repository.
- No `testsprite_tests/` directory.
- No `TestSprite/run-action` in `.github/workflows/`.

(For contrast, the sibling `lanonasis-maas` app in the monorepo carries both a
`.testsprite/config.json` and a `testsprite_tests/` folder. v-secure does not.)

## 3. Why the status reports "No tests detected"

The TestSprite GitHub App Pre-Check looks for a TestSprite project / test set
associated with the connected repository. Because:

1. there is **no v-secure TestSprite project** registered in the TestSprite
   account, and
2. this repository has **no committed TestSprite tests** and **no
   `.testsprite/config.json`** pointing at one,

the Pre-Check finds nothing in scope and, because **Blocking PRs** is enabled
for this repository in the Web Portal, it reports the empty scope as a
`failure` status rather than a neutral/skipped state. This is a
configuration/discovery defect, not a product regression from PR #131.

## 4. How the package/test layout maps to TestSprite

| Package / area       | Runner            | TestSprite-scope?                                     |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `oauth-client`       | Vitest (via first-party `ci.yml` → `npm test` → `test:packages`) | **No** (unit tests, not TestSprite UI/API specs) |
| `security-sdk`, `web`, `riskgpt` | Vitest (same first-party chain) | **No** (unit tests) |
| `vortex-secure`      | Vitest via its `vortex-mcp-sdk` subpackage (same first-party chain) | **No** (unit tests) |

**Reason `oauth-client` (and the other package suites) are out of TestSprite's
scope:** TestSprite runs two kinds of tests — **UI (frontend)**, Playwright
specs against a deployed URL, and **API (backend)**, Python assertions against a
deployed base URL. It does **not** execute a repository's own unit-test runner.
The oauth-client Vitest suite (including the PR #131 keytar-fallback coverage in
`oauth-client/src/__tests__/token-storage.test.ts`) is therefore covered by
first-party CI and is genuinely outside what TestSprite can exercise.

Consequence: a TestSprite gate on v-secure is only meaningful if v-secure has a
deployed, reachable surface with UI or API tests registered in a TestSprite
project. For an SDK/library package whose value is its unit/integration suite,
TestSprite does not add coverage and its gate should not be treated as the
release gate for those changes.

## 5. Options / required operator actions

All options below are **operator actions in the TestSprite Web Portal** or an
**approved coverage decision**. No repository-only change can implement them.
Smallest, least-destructive action first.

1. **Turn off `Blocking PRs` for v-secure** (Settings → GitHub App → v-secure →
   Blocking PRs = off). This makes the empty-scope Pre-Check non-blocking so a
   test-only/docs-only PR no longer shows a red merge-blocking gate. Keep `Run
   on Pull Requests` if you still want runs to fire once a project exists.
   *(Minimal change; does not delete any coverage.)*

2. **Disconnect v-secure** (Settings → GitHub App → v-secure → Remove) if
   TestSprite is not going to be used for this repository at all. Stops the
   noise entirely. Only do this with an explicit decision that first-party CI
   (lint/typecheck/build/test/security) is the approved coverage for v-secure.

3. **Wire a real v-secure project** so the gate exercises something: register a
   TestSprite **UI** project for the v-secure web app and/or an **API** project
   for a deployed service, generate TestSprite UI/API specs (MCP/portal), commit
   them (`testsprite_tests/`) and a `.testsprite/config.json`, map the repo to
   that project in the portal, and keep Blocking PRs on. This is the only option
   that makes the gate "discover and run tests" rather than report empty scope.

Option 3 is the only path that satisfies "at least one real TestSprite test
target is covered." Until then the correct posture per the guardrails is
option 1 or 2 (stop reporting empty scope as failure) — **not** writing a
workflow that fakes a passing `TestSprite Pre-Check` context, which would be a
bypass.

## 6. Guardrails observed

- No TestSprite removal or bypass is performed by this document. First-party CI
  (`ci.yml` lint/typecheck/build/test/security) is unchanged.
- This is not a product-regression claim about PR #131; PR #131 is a green
  test-only oauth-client guardrail PR.
- No secrets, tokens, API keys, or raw environment values are referenced.

## 7. Reference

- GitHub issue: https://github.com/lanonasis/v-secure/issues/132
- Evidence PR: https://github.com/lanonasis/v-secure/pull/131
- TestSprite GitHub integration docs:
  [TestSprite Web Portal → GitHub Integration](https://docs.testsprite.com/web-portal/integrations/github-integration) (official TestSprite documentation)
