# Releasing

Releases are made from `master` only. Do not publish from a local machine.

## Pre-release checklist

1. `CHANGELOG.md` has an entry for every user-visible change.
2. `package.json` version follows `VERSIONING.md`.
3. `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `SECURITY.md`, and `CONTRIBUTING.md` are current.
4. `docs/ADR/README.md`, `docs/GOVERNANCE.md`, `docs/LAUNCH_KIT.md`, and public feedback Issue #8 are current.
5. `npm run github:check` drift is reviewed; metadata is applied through the versioned workflow when a maintainer token is available.
6. `npm run check` passes locally.
7. `npm pack --dry-run` includes `dist/index.js`, `dist/infra/templates/index.html`, `scripts/doctor.mjs`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `SECURITY.md`.
8. The GitHub Actions CI matrix is green on Node 20, 22, and 24.

## Release steps

1. Push the versioned `vX.Y.Z` tag from `master`.
2. The tag workflow in `.github/workflows/release.yml` runs `npm ci`, checks, tests, builds, and `npm pack --dry-run`.
3. After verification succeeds, a separate workflow job uses the built-in `GITHUB_TOKEN` to create a GitHub Release from the matching `CHANGELOG.md` section. It checks `getReleaseByTag` first, so re-running a tag workflow never creates a duplicate Release.
4. After human approval, publish to npm using the repository's configured release environment and npm provenance. npm publishing is not automated by the tag workflow.
5. Verify `npx ai-draw-mcp` starts, `npm run doctor` passes, and the CHANGELOG version matches the published package.

## Rollback

npm does not allow replacing a published version. Fix forward with a patch release and document the incident in `CHANGELOG.md` and `SECURITY.md` when relevant.
