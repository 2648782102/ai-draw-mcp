# Open-source governance

This repository is maintained in public. Product copy, architecture decisions, release notes, and maintenance checks are versioned here so contributors and AI coding agents can verify claims without relying on an external dashboard.

## Public surfaces

- [`README.md`](../README.md) and [`README.en.md`](../README.en.md): product overview and quickstarts.
- [`ROADMAP.md`](../ROADMAP.md): direction, shipped work, and explicit non-goals.
- [`docs/ADR/README.md`](ADR/README.md): decisions about the human/AI protocol and safety boundaries.
- [`docs/LAUNCH_KIT.md`](LAUNCH_KIT.md): GitHub About, Release, Show HN, and community copy.
- [`CHANGELOG.md`](../CHANGELOG.md): user-visible changes per release.
- [`SECURITY.md`](../SECURITY.md): threat model, supported versions, and private reporting.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md): local setup, checks, and PR expectations.
- [Issue #8](https://github.com/2648782102/ai-draw-mcp/issues/8): public roadmap feedback thread.

## Maintainer checklist

1. Run `npm run check` and `node examples/collab-demo.mjs` before merging user-visible changes.
2. Run `npm run github:check` to compare repository description, homepage, and topics with `docs/LAUNCH_KIT.md`.
3. Trigger **Maintain GitHub metadata** with `dry_run=true`; if drift is reported, configure repository secret `GH_TOKEN` with `Administration: read and write`, then rerun with `dry_run=false`.
4. Keep Issue #8 current when the tool count, safety model, docs, or feedback questions change.
5. Create a GitHub Release from the matching `CHANGELOG.md` section; do not publish from a local machine.
6. Never paste tokens, approval grants, `.env` values, or private security details into issues, docs, or releases.

## Observed maintenance boundary

As of 2026-11-06 03:45 CST, `npm run github:check` again reports that the public repository has `description: null`, `homepage: null`, and `topics: []`. The repository already contains the desired versioned copy and a metadata workflow, but this environment has no `gh` binary, no `GH_TOKEN`/`GITHUB_TOKEN`, and the available GitHub connector exposes no repository-admin PATCH endpoint. The GitHub connector also has no Release creation or manual workflow-dispatch endpoint, and no tags/releases were listed in the earlier audit. The drift is therefore tracked, not silently rewritten or treated as a release blocker. A maintainer should apply the metadata through the versioned workflow with an administration-capable token.

## Decision process

Protocol and safety changes need an ADR, tests, and updates to `docs/ARCHITECTURE.md`, `AGENTS.md`, and `SECURITY.md`. Product-direction changes need a roadmap update and, when user-facing, an Issue #8 note. Dependency upgrades follow [`DEPENDENCY_MAINTENANCE.md`](DEPENDENCY_MAINTENANCE.md); major versions are reviewed individually rather than merged together.
