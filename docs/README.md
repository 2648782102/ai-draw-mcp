# Documentation Map

AI Draw MCP is a local-first MCP server and browser panel for **human ↔ AI visual collaboration**. The shortest description is: an AI scans a project into an editable graph, a human edits that graph and discusses intent, and an approved proposal turns the visual conversation into reviewed project changes.

Start with the [main README](../README.md) for installation and the product overview.

| Document | Audience | Purpose |
|---|---|---|
| [../README.en.md](../README.en.md) | International readers | English quickstart and safety-model summary |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | New users, maintainers | First-run checklist, common failures, and FAQ |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Contributors, reviewers | Components, collaboration protocol, REST/WebSocket API, safety model |
| [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md) | Maintainers, contributors | Market map, positioning, and product lessons from Mermaid/whiteboard/MCP tools |
| [DEPENDENCY_MAINTENANCE.md](DEPENDENCY_MAINTENANCE.md) | Maintainers | Dependabot policy, verification order, and major-version decisions |
| [LAUNCH_KIT.md](LAUNCH_KIT.md) | Maintainers | Copy for GitHub About, releases, Show HN, X/Mastodon, and Chinese communities |
| [GOVERNANCE.md](GOVERNANCE.md) | Maintainers, contributors | Public surfaces, maintainer checklist, and observed metadata drift |
| [ADR/README.md](ADR/README.md) | Contributors, reviewers | Accepted protocol and safety decisions with consequences and alternatives |
| [ADR/0007-agent-workflow-is-a-read-only-contract.md](ADR/0007-agent-workflow-is-a-read-only-contract.md) | AI agents, reviewers | Why the eight-step workflow is descriptive and never grants project-write authority |
| [ADR/0008-visual-undo-is-not-project-undo.md](ADR/0008-visual-undo-is-not-project-undo.md) | Contributors, reviewers | Why bounded graph history never reverses approved project writes |
| [ADR/0009-source-evidence-is-read-only-context.md](ADR/0009-source-evidence-is-read-only-context.md) | AI agents, reviewers | Why `file:line` scanner evidence is context, not write authority |
| [ADR/0010-node-context-is-a-read-only-projection.md](ADR/0010-node-context-is-a-read-only-projection.md) | AI agents, reviewers | Why a single-node context projection never changes focus or grants writes |
| [ADR/0011-shared-brief-is-a-read-only-projection.md](ADR/0011-shared-brief-is-a-read-only-projection.md) | AI agents, reviewers | Why the compact shared handoff brief excludes approval grants and never grants writes |
| [ADR/0012-viewport-is-read-only-attention-context.md](ADR/0012-viewport-is-read-only-attention-context.md) | AI agents, reviewers | Why human zoom/pan state never becomes a graph revision, timeline event, or write grant |
| [ADR/0013-decision-trail-is-a-read-only-projection.md](ADR/0013-decision-trail-is-a-read-only-projection.md) | AI agents, reviewers | Why a derived decision trail excludes approval grants and never replaces the full proposal diff |
| [../ROADMAP.md](../ROADMAP.md) | Everyone | Shipped direction, upcoming work, and explicit non-goals |
| [../AGENTS.md](../AGENTS.md) | AI coding agents | Repository map, coding conventions, tool registration, and safety rules |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contributors | Local setup, verification, PR expectations |
| [../SECURITY.md](../SECURITY.md) | Security reviewers | Threat model, supported versions, vulnerability reporting |
| [../CHANGELOG.md](../CHANGELOG.md) | Users | Versioned release notes |
| [../examples/README.md](../examples/README.md) | New users | MCP configs, diagram examples, and the end-to-end collaboration demo |

Portable `ai-draw-session-*.json` bundles are for bug reports and reproducible examples. They contain graph/chat/annotation-thread/proposal state, finite human coordinates, and the validated human focus, but never one-time approval grants; importing a bundle requires explicit human confirmation and never writes project files. The activity timeline is a derived, read-only view of those same source records and never grants project-write capability.

Stable-path rescans are documented in [ADR 0006](ADR/0006-stable-scan-preserves-human-visual-state.md): deterministic IDs and a read-only visual-state merge preserve layout, labels, threads, and focus while keeping scans separate from the proposal/write boundary.

Agent-facing workflow guidance is documented in [ADR 0007](ADR/0007-agent-workflow-is-a-read-only-contract.md): `get_agent_workflow` returns a session-derived `WORKFLOW_JSON` with readiness blockers and explicit `none` / `session` / `project` write targets, but never a capability token.

Visual history is documented in [ADR 0008](ADR/0008-visual-undo-is-not-project-undo.md): human-confirmed undo/redo restores a bounded graph snapshot as a new revision, while bundles omit the history and project writes stay outside its reach.

Source evidence is documented in [ADR 0009](ADR/0009-source-evidence-is-read-only-context.md): bounded `file:line` references survive scans and portable bundles with strict validation, but never expand proposal paths or grant write authority.

Node context is documented in [ADR 0010](ADR/0010-node-context-is-a-read-only-projection.md): `get_node_context` derives one node's evidence, threads, adjacent edges, and relevant diffs from the current session, but does not persist the projection, alter human focus, or grant project-write authority.

Shared briefs are documented in [ADR 0011](ADR/0011-shared-brief-is-a-read-only-projection.md): `get_shared_brief` derives a bounded handoff view from the session, separates stale threads from current intent, excludes approval grants, and never grants project-write authority.

Viewport attention is documented in [ADR 0012](ADR/0012-viewport-is-read-only-attention-context.md): the human panel publishes bounded, throttled zoom/pan state as read-only context; it never changes the graph, timeline, approval grants, or project files.

Decision trails are documented in [ADR 0013](ADR/0013-decision-trail-is-a-read-only-projection.md): `get_decision_trail` derives a bounded, evidence-labelled chronology from the current session, separates stale threads from current intent, excludes approval grants, and points reviewers back to the full line diff before any project write.

Design rule: keep public product copy versioned in the repository. `scripts/github-maintenance.mjs` and `scripts/repo-check.mjs` help prevent GitHub metadata, launch copy, README links, and changelog from drifting apart.

Test rule: `npm test` covers MCP integration, the collaboration loop, stable scan preservation, bounded visual history, source evidence, node context, annotation threads, the derived activity timeline, the agent workflow contract, and pure domain contracts for bundles, impact summaries, path safety, content hashes, and one-time approval grants. `npm run test:examples:workflow` runs the read-only workflow example end to end in a temporary workspace.
