# ADR 0022: The shared visual board is the product

## Status

Accepted. Supersedes ADR 0020 and clarifies the product hierarchy in ADR 0021.

## Context

ADR 0020 correctly kept project writes behind human approval and avoided growing a generic chat application, but it went further and made the MCP tool surface the product while demoting the canvas to a thin assistive panel. That boundary no longer matches the intended product: AI and people communicate about a project through a shared visual board.

The repository already contains a project graph, human graph edits, persistent node annotations, focus and selection, AI-readable context, AI replies in annotation threads, and proposal review. The panel renders AI replies but does not let a human continue that thread; its separate general correction composer copies text to the clipboard. The panel headline and default hierarchy still describe the older MCP-tool-first framing.

## Decision

- The local-first shared visual board is the product. Its project graph is the main human-facing surface and the shared context that connects human intent with AI understanding.
- MCP stdio is the AI access channel. MCP tools expose and update the board's structured state; they are not a separate product hierarchy that makes the board secondary.
- Human and AI communication is grounded in the graph: edits, focus, selection, evidence, notes, replies, and revisions should retain author and visual context and be readable in the same session.
- Contextual notes and replies support the board. A standalone general-purpose chat interface, hosted whiteboard, social presence, or mandatory turn-taking dashboard is outside the product direction.
- The restrained semantic visual system from ADR 0021 remains useful. Its element hierarchy must serve the shared canvas and contextual communication rather than the former thin-panel framing.
- Project code remains governed by the existing approval boundary: proposal, full diff, explicit human approval, one-time receipt, path-safety validation, and `SessionStore.applyProposal()`.
- Prefer existing version 1 graph, message, annotation, focus, selection, and proposal contracts. Any required protocol change needs an explicit compatibility decision and migration coverage.

## Consequences

- [Product direction](../PRODUCT_DIRECTION.md) is the authoritative product contract and phased implementation plan.
- README, architecture overview, `AGENTS.md`, roadmap, goal-mode guidance, package description, launch copy, and repository consistency checks must use the shared-board definition.
- The first implementation slice exposes human replies in the existing anchored annotation thread, reuses persisted session state, and removes the clipboard-only interaction as the primary communication path before broader visual cleanup.
- UI work prioritizes the canvas, current visual scope, anchored context, evidence, and relevant AI updates. Proposal review remains available as a secondary but explicit safety surface.
- Existing AI-only tool workflows remain supported. They become one way to access the shared board, not the reason the board exists.

## Safety consequence

This decision changes product hierarchy, not write authority. Graph edits, messages, notes, replies, focus, and selection do not authorize project writes. Only an explicitly approved proposal with its valid one-time receipt may be applied through the existing path-safety and rollback boundary.
