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

1. Run `npm run check` and `node examples/collab-demo.mjs` before merging user-visible changes. CI also runs `npm run docs:assets:check` and `npm run repo:check` on Node 20, 22, and 24.
2. Run `npm run github:check` to compare repository description, homepage, and topics with `docs/LAUNCH_KIT.md`.
3. Trigger **Maintain GitHub metadata** with `dry_run=true`; if drift is reported, configure repository secret `GH_TOKEN` with `Administration: read and write`, then rerun with `dry_run=false`.
4. Keep Issue #8 current when the tool count, safety model, docs, or feedback questions change.
5. Create a GitHub Release from the matching `CHANGELOG.md` section; do not publish from a local machine.
6. Never paste tokens, approval grants, `.env` values, or private security details into issues, docs, or releases.

## Observed maintenance boundary

As of 2026-11-06 04:14 CST, `npm run github:check` again reports that the public repository has `description: null`, `homepage: null`, and `topics: []`. The repository already contains the desired versioned copy and a metadata workflow, but this environment has no `gh` binary, no `GH_TOKEN`/`GITHUB_TOKEN`, and the available GitHub connector exposes no repository-admin PATCH endpoint. The GitHub connector also has no Release creation or manual workflow-dispatch endpoint, and no tags/releases were listed in the earlier audit. The drift is therefore tracked, not silently rewritten or treated as a release blocker. A maintainer should apply the metadata through the versioned workflow with an administration-capable token.

Local iteration `2c1cc06` was pushed with `npm run check` passing (10 test files, 36 tests), with the layout-preserving scan decision recorded in [ADR 0006](ADR/0006-stable-scan-preserves-human-visual-state.md), and with Issue #8 updated to describe `PRESERVATION_JSON` and the new feedback questions. Its CI run [42101490013](https://github.com/2648782102/ai-draw-mcp/actions/runs/42101490013) and the first hardening run [42102451871](https://github.com/2648782102/ai-draw-mcp/actions/runs/42102451871) both failed at `npm test` on all three Node versions while local macOS checks passed. The job-log download API requires repository-admin rights in this environment, so the exact console line is unavailable. A deterministic portability bug was found: the new collaboration test set `PUPPETEER_EXECUTABLE_PATH` to a macOS-only `/Applications/Google Chrome...` path, overriding Puppeteer's Linux headless-shell detection. The fix replaces that assumption with cross-platform candidate detection and keeps `scan_project(render: false)` for fast headless MCP graph/state checks. Full SVG rendering remains covered by the collaboration integration test. CI run [42102949857](https://github.com/2648782102/ai-draw-mcp/actions/runs/42102949857) is green on Node 20, 22, and 24 after `04dbc3e`, restoring the release gate.

Iteration `a58f6d4` shipped the 19th MCP tool `get_agent_workflow`, version 1 `WORKFLOW_JSON`, ADR 0007, a read-only CI example, and synchronized public docs. `npm run check` passed with 11 test files / 40 tests; CI run [42104946889](https://github.com/2648782102/ai-draw-mcp/actions/runs/42104946889) is green on Node 20, 22, and 24. The subsequent bounded visual undo/redo iteration adds ADR 0008, human-confirmed HTTP endpoints, diagnostics, and an integration test that asserts project files and approval state stay unchanged; local `npm test` passed with 12 test files / 43 tests. A later `npm run github:check` hit the unauthenticated public API rate limit, so that run cannot re-verify GitHub metadata; the connected GitHub API still reports `description: null` in workflow payloads, and the earlier no-admin-token evidence remains applicable.

CI run [42106218236](https://github.com/2648782102/ai-draw-mcp/actions/runs/42106218236) for `04720a6` was green on Node 22 and 24 but failed on Node 20: job `127521631309` shows `preserves human graph state through a human-confirmed rescan` timing out at 30,000 ms after three separate Mermaid headless-Chrome renders in the same test. This was a test-runtime issue on slower Node 20 runners, not a protocol or local logic failure. The follow-up iteration adds a strictly typed optional `render` boolean to the human-confirmed rescan endpoint, keeps the panel at `render: true`, and uses `render: false` for the repeated state-preservation assertions; full SVG rendering remains covered by the MCP rendering test and the panel's production path. The CI failure and its bounded fix are recorded here instead of being hidden by a larger timeout.

Iteration `6629983` was pushed after a full `npm run check` (13 test files / 44 tests), including the read-only source-evidence tests and the bounded rescan test. CI run [42107928211](https://github.com/2648782102/ai-draw-mcp/actions/runs/42107928211) is green on Node 20, 22, and 24. `npm run github:check` at 04:56 CST again observed `description: null`, `homepage: null`, and `topics: []`; the versioned metadata workflow remains the maintainer-facing path because this environment has no repository-administration token. Issue #8 was updated with ADR 0009, the evidence feedback question, and the CI stability note.

Iteration `e359cc4` adds the 20th MCP tool `get_node_context`, version 1 `NODE_CONTEXT_JSON`, a read-only HTTP endpoint and panel inspection view, ADR 0010, and synchronized public docs. It derives a single node's evidence, threads, adjacent edges, graph diffs, and focus state from the current session without persisting a duplicate or granting write authority. A full `npm run check` passed locally with 14 test files / 48 tests; CI run [42109486994](https://github.com/2648782102/ai-draw-mcp/actions/runs/42109486994) is green on Node 20, 22, and 24. Issue #8 has been updated with `NODE_CONTEXT_JSON`, ADR 0010, and the next product feedback questions.

Iteration `efab837` adds the 21st MCP tool `get_shared_brief`, version 1 `BRIEF_JSON`, a read-only HTTP endpoint, a panel handoff view and copy button, ADR 0011, and synchronized public docs. The brief is derived from the current session, bounded, excludes approval grants, separates stale threads from current intent, and never grants write authority. A full `npm run check` passed locally with 15 test files / 52 tests; the reproducible workflow example now verifies `BRIEF_JSON` before preflight. CI run [42111407361](https://github.com/2648782102/ai-draw-mcp/actions/runs/42111407361) is green on Node 20, 22, and 24. `npm run github:check` at 05:19 CST still reports `description: null`, `homepage: null`, and `topics: []`; the no-admin-token evidence remains unchanged, so the versioned metadata workflow is still the maintainer-facing path.

Iteration `a990f03` adds version 1 `SessionViewport`, a strictly validated human-panel endpoint, throttled browser synchronization, read-only exposure in `CONTEXT_JSON` / `BRIEF_JSON` / diagnostics / the panel, and ADR 0012. The viewport describes where the human is looking, but never increments `graphRevision`, creates messages/timeline events/graph diffs, enters bundles, issues approval grants, or writes project files. A full `npm run check` passed locally with 16 test files / 54 tests after a repository-consistency assertion was corrected; the second full run is clean. CI run [42112466147](https://github.com/2648782102/ai-draw-mcp/actions/runs/42112466147) is the release gate for this iteration.

## Decision process

Protocol and safety changes need an ADR, tests, and updates to `docs/ARCHITECTURE.md`, `AGENTS.md`, and `SECURITY.md`. Product-direction changes need a roadmap update and, when user-facing, an Issue #8 note. Dependency upgrades follow [`DEPENDENCY_MAINTENANCE.md`](DEPENDENCY_MAINTENANCE.md); major versions are reviewed individually rather than merged together.
