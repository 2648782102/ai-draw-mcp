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

Add a new ADR when a change affects the human/AI protocol, persisted state, tool surface, approval boundary, or public product direction. Keep the decision, alternatives, and safety consequence in one file.
