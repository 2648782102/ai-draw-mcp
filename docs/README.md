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
| [../ROADMAP.md](../ROADMAP.md) | Everyone | Shipped direction, upcoming work, and explicit non-goals |
| [../AGENTS.md](../AGENTS.md) | AI coding agents | Repository map, coding conventions, tool registration, and safety rules |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contributors | Local setup, verification, PR expectations |
| [../SECURITY.md](../SECURITY.md) | Security reviewers | Threat model, supported versions, vulnerability reporting |
| [../CHANGELOG.md](../CHANGELOG.md) | Users | Versioned release notes |
| [../examples/README.md](../examples/README.md) | New users | MCP configs, diagram examples, and the end-to-end collaboration demo |

Portable `ai-draw-session-*.json` bundles are for bug reports and reproducible examples. They contain graph/chat/annotation-thread/proposal state and the validated human focus, but never one-time approval grants; importing a bundle requires explicit human confirmation and never writes project files. The activity timeline is a derived, read-only view of those same source records and never grants project-write capability.

Design rule: keep public product copy versioned in the repository. `scripts/github-maintenance.mjs` and `scripts/repo-check.mjs` help prevent GitHub metadata, launch copy, README links, and changelog from drifting apart.

Test rule: `npm test` covers MCP integration, the collaboration loop, annotation threads, the derived activity timeline, and pure domain contracts for bundles, impact summaries, path safety, content hashes, and one-time approval grants.
