# ADR 0016: Source navigation is copyable context

- Status: Accepted
- Date: 2026-11-06

## Decision

`get_source_navigation` returns a version 1 `SOURCE_NAVIGATION_JSON` derived from the `GraphSourceEvidence` already attached to the current `VisualGraph`. Each bounded item contains the node ID/label, evidence kind, workspace-relative `file:line`, excerpt, and copyable `vscode://file/...`, `cursor://file/...`, and `code --goto ...` text. `GET /api/collab/source-navigation` exposes the same projection to the panel; the panel renders and copies the relative `file:line` list.

The builder filters evidence to version 1, positive integer lines, and safe workspace-relative path segments. It excludes absolute paths, traversal segments, `.git`, `node_modules`, and `.env`-like names. The tool never reads project files again, opens an editor, launches a process, executes a URI/command, writes the session, changes focus/threads/proposals, or grants project-write authority. All outputs carry `readOnly: true`, `grantsWriteAuthority: false`, `excludesApprovalGrants: true`, `excludesAbsolutePaths: true`, `doesNotOpenFiles: true`, and `projectWritesRequireHumanApproval: true`.

## Rationale

Visual graph nodes already carry bounded source evidence, but humans and coding agents still had to translate `path` + `line` into an IDE action manually. Public product comparisons show source navigation as useful, and [VS Code's official CLI documentation](https://code.visualstudio.com/docs/configure/command-line) documents `code --goto file:line[:character]` plus `vscode://file/{full path}:line:column` formats. Directly invoking a local editor from the MCP server would add platform-specific process execution, path disclosure, and an unnecessary side-effect surface. A deterministic, copyable projection preserves the usability benefit while keeping the server local-first and strictly read-only. Cursor URI text is offered as a copyable convention for VS Code-family editors, not as an official Cursor deep-link contract.

The output intentionally uses relative paths. It is a navigation hint for a human who has the workspace open, not a portable absolute filesystem identifier. It must not become a way to smuggle credentials, hidden files, or uncontrolled local commands into agent context.

## Alternatives

- **Call `code --goto` or open a `vscode://` URI from the server:** rejected because it executes external side effects, varies by IDE/platform, and exposes absolute paths.
- **Add language-aware symbol ranges now:** deferred; a stable copyable `file:line` surface is the prerequisite, while AST/LSP adapters remain optional integrations.
- **Persist navigation targets in `SessionSnapshot`:** rejected because they are derived from existing evidence and would drift after scans/bundles.
- **Return absolute paths for one-click opening:** rejected because portable bundles, prompts, and issues should not contain machine-specific paths or sensitive directory names.
- **Treat navigation as approval or evidence of file writability:** rejected because source lookup is context only; proposals and one-time receipts remain the only project-write path.

## Consequences

- The MCP tool surface grows from 22 to 23 tools; all counts, docs, examples, and offline checks are synchronized.
- Humans can copy a bounded source-navigation list from the panel; agents can cite a consistent `file:line` format without a second context-assembly step.
- The read-only endpoint and pure builder are covered by pure, MCP, HTTP, and offline consistency tests.
- Future language-aware ranges can extend the item shape behind a new explicit version or optional field without making the server execute anything.

## Safety invariant

`SOURCE_NAVIGATION_JSON` is a derived read-only hint. It never writes session or project files, opens files, launches an IDE, executes commands, exports approval grants, or expands proposal path permissions. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
