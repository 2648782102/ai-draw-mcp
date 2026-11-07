# ADR 0023: Board modules and the diagram-library boundary

## Status

Accepted. Refines ADR 0022 for the default panel composition.

## Context

The shared visual board is the product, but the old panel mixed a hidden diagram sidebar, floating canvas object card, flow rail, toolbar overflow menu, and several meanings of "save". The first implementation of this ADR still had two stacked headers, a legacy Flow rail, and several floating status projections. Those remnants made the canvas feel like a settings dashboard rather than one place where a person and an AI talk through a project model. Opening a historical diagram changed `currentId` without changing the collaboration session's active diagram, which could show object threads that no longer matched the canvas.

## Decision

- The default surface is three explicit modules: one board header, one continuous canvas, and one fixed object inspector.
- The single board header carries product identity, live board status, the approval boundary, scanning, saving the shared graph, the library, downloads/source utilities, and the secondary review surface. The legacy brand header, visual-system switches, standalone render toolbar, and Flow rail are not part of the default view.
- The object inspector stays beside the canvas. It is the single place to inspect the selected object, its evidence, its relationships, and the ordered human/AI thread. Derived context is shown as compact object facts instead of separate floating diagnostic cards.
- The diagram library is an on-demand, keyboard-accessible drawer. It lists local diagram records, identifies the active board, and offers preview, return, download, copy, and delete actions.
- Opening a library record is a local preview only. It does not change `SessionSnapshot.activeDiagramId`, object threads, focus, selection, proposals, or approval credentials. The inspector enters an explicit read-only history state with a return action.
- "Save graph" writes the current shared `VisualGraph` through `PUT /api/collab/graph`. "Save source" updates an existing local diagram record through `PUT /api/diagram/:id`. Downloads and session export are separate actions.
- Library open state, appearance, and other local view preferences remain browser-local. No new server write endpoint, protocol field, or approval path is introduced.

## Consequences

- A person can distinguish the current shared board from historical diagram records without learning MCP tool names.
- Switching a historical preview cannot silently desynchronize AI context from the canvas.
- The review surface remains available on demand for graph editing, derived context, proposal review, and approval, but it is no longer the default first screen or a competing status layer.
- Browser regressions verify that the legacy header and Flow rail stay hidden, the board header remains visible, and the object inspector remains the persistent communication surface.
- Existing version 1 contracts, the 26 MCP tools, path safety, full diff review, human approval, and one-time receipts remain unchanged.

## Safety consequence

This decision reorganizes presentation and action names only. It grants no project-write authority. All project writes still require a proposal, complete diff, explicit human approval, a valid one-time receipt, path validation, and `SessionStore.applyProposal()`.
