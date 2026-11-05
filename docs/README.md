# Documentation Map

AI Draw MCP is a local-first MCP server and browser panel for **human ↔ AI visual collaboration**. The shortest description is: an AI scans a project into an editable graph, a human edits that graph and discusses intent, and an approved proposal turns the visual conversation into reviewed project changes.

Start with the [main README](../README.md) for installation and the product overview.

| Document | Audience | Purpose |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Contributors, reviewers | Components, collaboration protocol, REST/WebSocket API, safety model |
| [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md) | Maintainers, contributors | Market map, positioning, and product lessons from Mermaid/whiteboard/MCP tools |
| [LAUNCH_KIT.md](LAUNCH_KIT.md) | Maintainers | Copy for GitHub About, releases, Show HN, X/Mastodon, and Chinese communities |
| [../ROADMAP.md](../ROADMAP.md) | Everyone | Shipped direction, upcoming work, and explicit non-goals |
| [../AGENTS.md](../AGENTS.md) | AI coding agents | Repository map, coding conventions, tool registration, and safety rules |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contributors | Local setup, verification, PR expectations |
| [../SECURITY.md](../SECURITY.md) | Security reviewers | Threat model, supported versions, vulnerability reporting |
| [../CHANGELOG.md](../CHANGELOG.md) | Users | Versioned release notes |
| [../examples/README.md](../examples/README.md) | New users | MCP configs, diagram examples, and the end-to-end collaboration demo |

Design rule: keep public product copy versioned in the repository. `scripts/github-maintenance.mjs` and `scripts/repo-check.mjs` help prevent GitHub metadata, launch copy, README links, and changelog from drifting apart.
