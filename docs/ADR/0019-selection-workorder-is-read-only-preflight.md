# ADR 0019: A selection workorder is read-only pre-proposal context

## Status

Accepted

## Context

ADR 0018 introduced bounded human multi-node selection as a machine-readable answer to "these modules". `SELECTION_SCOPE_JSON` tells an AI which nodes, internal edges, and safe relative source locations the human is pointing at, but agents still have to assemble pending messages, anchored annotation threads, review readiness, candidate paths, and missing evidence before they can safely discuss a change. Asking an agent to infer that checklist from several projections increases the chance of treating a selected node as a batch-write command or silently inventing file content.

The product needs a short, reproducible bridge between the visual selection and the existing proposal workflow. That bridge must not become a hidden authority: only a full line diff, explicit human approval, and a one-time receipt can lead to `apply_visual_proposal` writing project files.

## Decision

Add the 26th MCP tool `get_selection_workorder` and the read-only `GET /api/collab/selection-workorder` endpoint. Both derive version 1 `SELECTION_WORKORDER_JSON` from the same `SessionSnapshot`, without persisting a new state object:

- bounded selected nodes, internal edges, safe workspace-relative candidate paths, safe `file:line` evidence, and per-node active/stale thread counts;
- a pure `freshness` hint comparing `selectionRevision` with the current `graphRevision` (`current` / `stale` / `none`), with a descriptive reselect gap when the graph changed;
- bounded pending human messages and active selected annotation threads as intent cues, with stale threads represented as gaps rather than current intent;
- a compact `REVIEW_READINESS_JSON` status, explicit gaps, next actions, copy text, and guidance;
- fixed safety flags: `readOnly: true`, `grantsWriteAuthority: false`, `excludesApprovalGrants: true`, `excludesAbsolutePaths: true`, `excludesProjectChangeContent: true`, and `projectWritesRequireHumanApproval: true`.

Candidate paths are descriptive strings marked `status: "candidate"`. Freshness is also descriptive: a stale selection is never auto-refreshed, cleared, or treated as a write grant. The workorder contains no `ProjectChange` array, UTF-8 file content, line diff, proposal, approval receipt, or absolute workspace path. It does not re-read project files, resolve approval state, mutate the selection, change `graphRevision`, emit a message or timeline event, enter a portable bundle, or expand the permitted path set of a future proposal.

The panel displays the same derived checklist and can copy it as a prompt telling the AI to call `get_selection_workorder`, read the full visual context, resolve gaps with the human, then explicitly draft changes and call `preflight_visual_proposal` before `create_visual_proposal`.

## Alternatives considered

- **Generate `changes` directly from selected nodes:** rejected because a selection is attention context, not a specification of file content or create/update intent.
- **Treat a selected path as permission to write:** rejected because path safety, filesystem preflight, a reviewable full line diff, human approval, and a one-time receipt remain separate gates.
- **Persist a workorder state machine:** rejected because the checklist is a pure projection and a second persisted state would drift from graph revisions, threads, and readiness.
- **Silently refresh a stale selection:** rejected because the human's chosen node IDs are intentional context; an agent must ask for re-selection through the panel rather than infer a new scope after a graph revision.
- **Include stale threads as intent:** rejected because ADR 0003 already requires human review or re-anchoring before stale discussion becomes current intent.
- **Allow unbounded paths, intent, and evidence:** rejected because bounded projections keep prompts, DOM rendering, and accidental scope expansion predictable.

## Consequences

- `SERVER_TOOL_COUNT`, `CAPABILITIES_JSON`, README, AGENTS, architecture, security, roadmap, launch copy, examples, troubleshooting, ADR index, tests, and offline checks grow from 25 tools / 18 ADRs to 26 tools / 19 ADRs together.
- `SELECTION_SCOPE_JSON` remains the raw bounded selection projection; `SELECTION_WORKORDER_JSON` is the optional pre-proposal checklist derived from it. Neither bypasses `PREFLIGHT_JSON`, `PROPOSAL_JSON`, or the one-time human receipt.
- Future protocol additions must keep the workorder a pure projection and update its versioned type, tests, documentation, and capability catalogue together.

## Safety consequence

`SELECTION_WORKORDER_JSON` is a bounded, read-only human/AI conversation aid. It never grants project-write authority and never contains a write credential or project-change content. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
