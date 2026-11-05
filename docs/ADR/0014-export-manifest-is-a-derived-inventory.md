# ADR 0014: Export manifest is a derived inventory

- Status: Accepted
- Date: 2026-11-06

## Decision

`GET /api/collab/bundle/manifest` returns a version 1 `EXPORT_MANIFEST_JSON` derived from the same portable `SessionBundle` that `GET /api/collab/bundle` exports. The panel embeds this manifest as an `exportManifest` annotation in the downloaded JSON so bug reports, examples, and reviews carry a readable inventory alongside the complete session snapshot.

The manifest lists format/version, session ID, graph revision, export time, suggested filename, bounded counts for graph nodes/edges/annotations/replies/source evidence, focus, graph diffs, messages, and proposals, and the number of approved proposal states downgraded to pending. It explicitly enumerates excluded fields (`approvalId`, `approvalGrant`, `approvalExpiresAt`, `graphHistory`, `viewport`) and fixed safety flags: `readOnly: true`, `grantsWriteAuthority: false`, `excludesApprovalGrants: true`, `excludesGraphHistory: true`, `excludesViewport: true`, and `projectWritesRequireHumanApproval: true`.

The manifest is descriptive only. It is not persisted in the session, is not a second source of truth, does not change the bundle's import behavior, does not approve or apply proposals, and never grants write authority. `parseSessionBundle()` continues to project only the validated `session` fields; a top-level `exportManifest` annotation is ignored on import. `buildExportManifest()` rejects non-version-1 input and credential-like proposal metadata before producing any inventory.

## Rationale

Portable bundles are useful for reproducible bug reports, but a large JSON file does not quickly answer "what is included, what was deliberately excluded, and which approval state was downgraded?" A deterministic manifest makes the export contract self-describing for humans, coding agents, and maintainers without duplicating the session or making sensitive fields easier to overlook. Deriving it from the exported bundle avoids a separate state store and keeps the inventory consistent with the exact artifact being downloaded.

## Alternatives

- **Add a second MCP tool for manifests:** rejected because the manifest is a local panel/export artifact, not an agent-facing collaboration context; a read-only HTTP endpoint is sufficient.
- **Persist the manifest in `SessionSnapshot`:** rejected because export time, filename, and inventory are derived from a point-in-time artifact and would create drift.
- **Replace the full bundle with a summary:** rejected because reproduction and regression reports need the validated graph, messages, threads, focus, diffs, and downgraded proposals.
- **Include approval grant metadata or a receipt status:** rejected because portable artifacts must never become reusable credentials.
- **Make import require `exportManifest`:** rejected because older bundles remain valid and adding a required field would break compatibility; strict `session` validation remains the authority.

## Consequences

- The panel's exported JSON now has an optional top-level `exportManifest`; existing bundle imports and strict validation are unchanged.
- Offline checks guard the domain builder, HTTP endpoint, panel export code, excluded-field inventory, safety flags, pure contract test, and HTTP regression test.
- The manifest's proposal metadata check rejects credential-like keys; future metadata fields must be explicitly allow-listed and documented.
- `EXPORT_MANIFEST_JSON` remains a bounded, credential-free projection even if the full bundle contains larger human text or file-change content.
- Full line diff review, human approval, and a one-time receipt remain mandatory before any project write.

## Safety invariant

`EXPORT_MANIFEST_JSON` is a read-only inventory. It never exports, recreates, or validates an approval grant; it does not write session or project files; and it cannot replace human review of the full line diff. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
