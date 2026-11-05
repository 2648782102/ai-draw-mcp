# ADR 0017: Capability catalogue is read-only discovery

- Status: Accepted
- Date: 2026-11-06

## Decision

`get_capabilities` returns a version 1 `CAPABILITIES_JSON` derived from the current `SessionSnapshot` and a versioned in-code tool catalogue. It lists all 24 MCP tools, their group/purpose/output marker, `readOnly` and `writes` target, the machine-readable JSON contracts, the eight-step workflow's blocked count, the derived review-readiness status, one suggested next action, and fixed safety invariants. `GET /api/collab/capabilities` returns the same projection; the local panel renders a bounded summary and can copy the full catalogue into a human-to-AI handoff.

The catalogue is descriptive. It never calls other tools, reads project files again, scans the filesystem, changes the session, creates a proposal, opens an editor, exports credentials or absolute workspace paths, or grants project-write authority. Only `apply_visual_proposal` is marked `writes: "project"`, and its description still requires full line-diff review, human approval, and a one-time receipt.

## Rationale

MCP clients can discover raw tool definitions with `tools/list`, but that listing does not explain this project's collaboration protocol: which JSON markers are bounded projections, which steps write session state, which single tool may write project files, or what safe action follows the current blockers. New agents had to assemble that model from README prose and several tool descriptions. A deterministic capability tool lowers onboarding cost and gives client self-checks one stable, versioned response.

The catalogue deliberately augments, rather than replaces, MCP's native capability negotiation and `tools/list` tool definitions. It is an application-level orientation contract for humans and coding agents. Official MCP SDK documentation describes `listTools()` as a way to list advertised tools; that protocol listing remains authoritative for tool names and input schemas. `CAPABILITIES_JSON` contributes product-level grouping, JSON markers, workflow readiness, and the write boundary, all with no side effect.

Reusing `buildAgentWorkflow()` and `buildReviewReadiness()` keeps the suggested next action consistent with the same session snapshot. A blocked workflow explicitly wins over a `ready` diagnostic so the catalogue cannot be misread as permission to skip conversation handoff. The catalogue is generated from a typed constant and `SERVER_TOOL_COUNT`, with tests and offline checks keeping the count, names, output markers, and unique project-write tool aligned.

## Alternatives

- **Rely only on `tools/list` and tool descriptions:** rejected because raw protocol discovery cannot express this project's workflow ordering, bounded JSON projections, or human-approval boundary in one deterministic response.
- **Put the catalogue in a static documentation file only:** rejected because agents cannot discover the current server version, session revision, workflow blockers, or review status without another tool call.
- **Persist per-client capability state in `SessionSnapshot`:** rejected because capabilities are server-level descriptive metadata plus a point-in-time derived readiness signal; persisting either would drift and add unnecessary session authority.
- **Let the capability tool call other tools or run a self-test:** rejected because discovery must stay read-only and deterministic, with no rendering, filesystem, or editor side effects.
- **Treat `ready` or a capability listing as approval:** rejected because only a human-reviewed full diff, panel approval, and a one-time receipt may lead to a project write.

## Consequences

- The MCP tool surface grows from 23 to 24 tools; `SERVER_TOOL_COUNT`, README, AGENTS, roadmap, launch copy, tests, examples, and offline checks are synchronized.
- New agents can read one bounded JSON object before choosing `get_agent_workflow`, `get_visual_context`, or a narrower projection; humans can copy the same object from the panel.
- The panel's capability view links tool/JSON markers to the next safe action and the unique project-write tool, without issuing credentials or opening files.
- Pure, MCP, HTTP, workflow-example, and offline consistency tests guard the catalogue's bounded shape, safety flags, unique project writer, and credential/absolute-path exclusions.
- Future protocol additions must update the typed catalogue, `SERVER_TOOL_COUNT`, ADR, docs, and tests together; an out-of-date catalogue fails the offline repository check.

## Safety invariant

`CAPABILITIES_JSON` is descriptive, read-only discovery. It never invokes tools, reads project files, writes session or project files, exports approval grants or workspace absolute paths, changes proposal state, or grants write authority. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
