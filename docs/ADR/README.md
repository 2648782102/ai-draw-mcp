# Architecture Decision Records

ADRs capture product and protocol decisions that contributors and AI coding agents should not have to reverse-engineer from code. Each record is short, versioned in the repository, and linked from this index.

| ADR | Status | Decision |
|---|---|---|
| [0001-visual-intent-and-human-approval.md](0001-visual-intent-and-human-approval.md) | Accepted | The visual graph is shared intent, but only a human-approved proposal can write project files. |
| [0002-conversation-state-is-not-authority.md](0002-conversation-state-is-not-authority.md) | Accepted | Threads, timelines, bundles, and derived context never grant write authority. |
| [0003-stale-annotation-anchors.md](0003-stale-annotation-anchors.md) | Accepted | Changed or removed graph nodes make linked discussions explicitly stale until human review. |
| [0004-read-only-proposal-preflight.md](0004-read-only-proposal-preflight.md) | Accepted | AI checks candidate changes read-only before creating a proposal. |
| [0005-human-focus-is-read-only-context.md](0005-human-focus-is-read-only-context.md) | Accepted | A human-selected node is shared attention context, never write authority. |
| [0006-stable-scan-preserves-human-visual-state.md](0006-stable-scan-preserves-human-visual-state.md) | Accepted | Deterministic, read-only scans preserve human layout, threads, and focus without granting project writes. |
| [0007-agent-workflow-is-a-read-only-contract.md](0007-agent-workflow-is-a-read-only-contract.md) | Accepted | A versioned, machine-readable workflow describes prerequisites and side effects without granting write authority. |
| [0008-visual-undo-is-not-project-undo.md](0008-visual-undo-is-not-project-undo.md) | Accepted | Bounded graph undo/redo creates a new visual revision and never reverses approved project writes. |
| [0009-source-evidence-is-read-only-context.md](0009-source-evidence-is-read-only-context.md) | Accepted | Bounded `file:line` scanner evidence helps humans and AI cite code without granting write authority. |
| [0010-node-context-is-a-read-only-projection.md](0010-node-context-is-a-read-only-projection.md) | Accepted | Single-node context is a derived read-only view, never a focus mutation or write grant. |
| [0011-shared-brief-is-a-read-only-projection.md](0011-shared-brief-is-a-read-only-projection.md) | Accepted | The compact shared handoff brief is derived, excludes approval grants, and never grants write authority. |
| [0012-viewport-is-read-only-attention-context.md](0012-viewport-is-read-only-attention-context.md) | Accepted | Human zoom/pan state is bounded attention context, never a graph revision, timeline event, or write grant. |
| [0013-decision-trail-is-a-read-only-projection.md](0013-decision-trail-is-a-read-only-projection.md) | Accepted | A derived decision trail links intent and proposal evidence without approval grants or write authority. |
| [0014-export-manifest-is-a-derived-inventory.md](0014-export-manifest-is-a-derived-inventory.md) | Accepted | A portable bundle's derived inventory describes contents and exclusions without granting writes. |
| [0015-review-readiness-is-a-derived-diagnostic.md](0015-review-readiness-is-a-derived-diagnostic.md) | Accepted | A composed review-readiness status remains a diagnostic, never a new workflow state or write grant. |
| [0016-source-navigation-is-copyable-context.md](0016-source-navigation-is-copyable-context.md) | Accepted | Source navigation is bounded, relative copyable text; the server never opens a file or launches an editor. |
| [0017-capability-catalogue-is-read-only-discovery.md](0017-capability-catalogue-is-read-only-discovery.md) | Accepted | A versioned capability catalogue describes tools, JSON contracts, and write boundaries without invoking tools or granting writes. |
| [0018-human-selection-is-read-only-scope.md](0018-human-selection-is-read-only-scope.md) | Accepted | Bounded human multi-node selection describes an intent scope without granting writes or entering portable bundles. |
| [0019-selection-workorder-is-read-only-preflight.md](0019-selection-workorder-is-read-only-preflight.md) | Accepted | A derived selection workorder is a bounded pre-proposal checklist without file content, proposals, or write authority. |
| [0020-mcp-tool-is-the-primary-product.md](0020-mcp-tool-is-the-primary-product.md) | Superseded by 0022 | Historical MCP-tool-first product hierarchy; its human-approval safety constraints remain in force. |
| [0021-restrained-visual-system.md](0021-restrained-visual-system.md) | Superseded for product hierarchy by 0022 | Its semantic tokens and visual consistency remain useful; the thin-panel information hierarchy is no longer the target. |
| [0022-shared-visual-board-is-the-product.md](0022-shared-visual-board-is-the-product.md) | Accepted | The local-first shared visual board is the product; MCP is the AI access channel and code writes retain human approval. |

Add a new ADR when a change affects the human/AI protocol, persisted state, tool surface, approval boundary, or public product direction. Keep the decision, alternatives, and safety consequence in one file.
