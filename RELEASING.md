# Releasing

Releases are made from `master` only. Do not publish from a local machine.

## Pre-release checklist

1. `CHANGELOG.md` has an entry for every user-visible change.
2. `package.json` version follows `VERSIONING.md`.
3. `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `SECURITY.md`, and `CONTRIBUTING.md` are current.
4. `npm run check` passes locally.
5. `npm pack --dry-run` includes `dist/index.js`, `dist/infra/templates/index.html`, `scripts/doctor.mjs`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `SECURITY.md`.
6. The GitHub Actions CI matrix is green on Node 20, 22, and 24.

## Release steps

1. Create a GitHub Release with tag `vX.Y.Z` targeting `master`.
2. The tag workflow in `.github/workflows/release.yml` runs `npm ci`, checks, tests, builds, and `npm pack --dry-run`.
3. After human approval, publish to npm using the repository's configured release environment and npm provenance.
4. Verify `npx ai-draw-mcp` starts, `npm run doctor` passes, and the CHANGELOG version matches the published package.

## Rollback

npm does not allow replacing a published version. Fix forward with a patch release and document the incident in `CHANGELOG.md` and `SECURITY.md` when relevant.
