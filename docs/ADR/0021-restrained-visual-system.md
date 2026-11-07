# ADR 0021: One restrained visual system for the panel

## Status

Superseded by [ADR 0022](0022-shared-visual-board-is-the-product.md) for product hierarchy. This ADR records the shipped 0.3.x presentation baseline. Its semantic tokens and visual consistency remain useful; the thin-panel information hierarchy is no longer the product target.

## Context

The local panel accumulated three named visual systems, ambient effects, a diagram library rail, overlapping status surfaces, floating cards, progress rails, and several redundant entry points. The result looked busy and made the thin assistive layer feel like a standalone product. The user asked for subtraction, consolidation, and consistent UI.

The frontend-design and frontend-ui-engineering skills both recommend restraint: one semantic token system, one accent, a small spacing scale, flat surfaces, visible focus, responsive behavior, and removing decoration that does not help the user. ADR 0020 already establishes that MCP tools are the product and the panel is only a local helper for viewing AI-generated context, making lightweight corrections, reviewing a full diff, and issuing human approval.

## Decision

The panel uses one restrained workbench visual system:

- Semantic tokens define one canvas, panel, raised surface, line, ink, muted ink, accent, status color, radius, shadow, and spacing scale. The dark and light themes remap the same tokens; Aurora, Studio, Atlas, and ambient classes remain only as compatibility hooks and no longer produce distinct presentations.
- The product chrome is reduced to a brand, one compact status line, one primary review action, the canvas, and a small canvas control dock. The diagram library, status bar, context banner, view switcher, render button, low-frequency toolbar menus, floating pulse, handoff rail, lens, minimap, and decorative frames are hidden from the default presentation.
- The first-run card is a single narrow column. The canvas uses one quiet dot grid. Buttons, nodes, edge labels, cards, and dialogs use the same flat surface, border, radius, and focus outline.
- Keyboard and command-palette paths remain the escape hatch for less frequent local preferences. Compatibility DOM nodes and version 1 contracts are retained so hidden controls do not break existing initialization or tests.
- Reproducible screenshots show the unified system only; Studio and Atlas screenshot promises are removed from current public copy. Historical changelog and launch evidence remains as a record of earlier iterations.

This is a presentation-layer decision. It does not add a new feature, tool, protocol field, persisted state, or write path.

## Alternatives considered

- **Keep three selectable visual systems:** rejected because parallel skins multiplied CSS, screenshots, documentation, and visual noise without improving AI-readable context or human review.
- **Redesign around a new branded hero or dashboard:** rejected because the panel is a thin helper, not the product subject; a stronger visual identity would compete with the graph and approval material.
- **Remove all legacy classes and DOM nodes immediately:** rejected because hidden compatibility nodes prevent script initialization regressions and preserve local preference migration without expanding the visible UI.
- **Add a design-system dependency or component framework:** rejected because the panel is a single local template and the existing token layer is sufficient.

## Consequences

- Current README, English README, docs map, launch copy, and reproducible screenshot script describe one unified visual system.
- Browser regressions assert that duplicate chrome is hidden, flat semantic surfaces are used, and visible contexts remain reachable through keyboard/command paths.
- Contributors should not reintroduce alternate skins, decorative gradients, glows, status orbits, or duplicate chrome without a new ADR reversing this decision.
- Legacy CSS and compatibility classes can be removed in a later, separately tested cleanup once no local preferences depend on them.

## Safety consequence

No safety boundary is relaxed. Panel writes still require `PANEL_TOKEN`; AI replies and annotations remain read-only context signals; project writes still require `preflight_visual_proposal`, `create_visual_proposal`, a full line diff, explicit human approval, a one-time receipt, `path-safety.ts`, and `SessionStore.applyProposal()`. Hidden visual preferences never grant write authority.
