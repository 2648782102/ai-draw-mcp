# Dependency Maintenance

This project uses Dependabot for weekly npm and GitHub Actions updates. The policy is to keep CI green and security issues visible without making risky major upgrades part of an unrelated product commit.

## Verification order

1. `npm ci` on Node 20, 22, and 24.
2. `PUPPETEER_EXECUTABLE_PATH=<local Chrome> npm run check`.
3. `PUPPETEER_EXECUTABLE_PATH=<local Chrome> node examples/collab-demo.mjs`.
4. GitHub Actions push CI on `master` across the Node matrix.
5. `npm audit --omit=dev` review, with a separate issue/PR for actionable production findings.

## 2026-11-06Dependabot snapshot

A first wave of seven Dependabot PRs was opened against `27343a8`. Their CI failures were investigated:

- `actions/checkout@v7` / `actions/setup-node@v7`: major GitHub Actions runtime upgrades. Keep isolated in dedicated PRs; do not fold into feature work.
- `@mermaid-js/mermaid-cli@12` and `mermaid@12`: major renderer upgrades. A local dependency trial hung during `npm ci` before build/test could complete, so the main branch intentionally stayed on the verified 11.x line.
- `@modelcontextprotocol/sdk@1.32.2`, `tsx@4.23.15`, `zod@4.6.7`: the Zod v4 CI type error was fixed on `master` with `z.record(z.string(), z.unknown())`; remaining upgrades should be re-tested after rebasing.
- A local `npm ci` trial with all major upgrades was abandoned because install scripts did not complete; no lockfile changes were copied into the repository.

The first wave also reported that the repository did not have the `dependencies` and `ci` labels configured in `dependabot.yml`. Those label references were removed on `master`: Dependabot can open and update PRs using repository defaults, and maintainers can triage with existing issue labels or add new labels deliberately. This avoids bot comments on every dependency PR while preserving reproducible upgrade review.

## 2026-11-06 08:03 CST audit snapshot

At `45e8280` / version 0.3.4, `npm audit --omit=dev --json` reported 29 advisories: 1 critical, 20 high, 6 moderate, and 2 low. The critical item is `proxy-addr` (IPv4-mapped IPv6 trust-subnet spoofing); high-severity clusters include Mermaid/Puppeteer tooling, MCP TypeScript SDK, `body-parser`/`qs`/`ws`, DOMPurify/PostCSS/source-map parsing, and `sharp` libvips/libheif. `npm audit fix --dry-run --omit=dev` proposes broad transitive and major-version movement, including Mermaid CLI, MCP SDK, Puppeteer, Zod, sharp, and renderer dependencies; it was therefore **not applied** to `master`. This snapshot is informational: each open Dependabot PR must still be rebased onto the latest release line and pass `npm ci`, the full matrix CI, `npm run check`, and `node examples/collab-demo.mjs` before any merge. No lockfile was edited and no existing tag or Release was retagged.

## Decision rules

- Merge patch/minor upgrades only after the push CI is green on every supported Node version.
- Treat Mermaid CLI, Mermaid, Zod, TypeScript, and GitHub Actions majors as separate, reviewable changes.
- Never merge a dependency PR to "clear red checks" if it has not been rebased onto current `master` and verified with the full collaboration demo.
- Record `PUPPETEER_EXECUTABLE_PATH` or `chrome-headless-shell` requirements in CI when renderer behavior changes.
- Keep `package-lock.json` and `npm ci` as the reproducible source of truth; do not hand-edit lockfiles.

## Known environment caveat

On Ubuntu 23.10+ and some hardened CI images, Chrome refuses to launch without `--no-sandbox`. The renderer and `doctor` now generate a temporary Puppeteer config automatically when `CI=true` or `GITHUB_ACTIONS=true`, or when `MERMAID_CHROME_NO_SANDBOX=1` is set explicitly.
