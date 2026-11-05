# Versioning

AI Draw MCP follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

During the `0.x` series:

- Breaking changes increment the minor version: `0.2.0` → `0.3.0`.
- Backward-compatible features increment the minor version.
- Fixes and documentation-only corrections increment the patch version.

A breaking change includes, but is not limited to:

- Renaming/removing an MCP tool, or changing required tool parameters.
- Changing the machine-readable `ID:` / `JSON:` response lines consumed by models.
- Changing environment variable names, defaults, ports, output directories, or persisted protocol versions.
- Changing the preview REST/WebSocket contract in a way old panels cannot ignore.
- Raising the minimum supported Node.js version.

The MCP server reports its version from `package.json`; keep package version, `CHANGELOG.md`, and release tags in sync.

## Supported versions

Only the latest `0.3.x` release receives fixes. Older `0.2.x`, `0.3.0`, and `0.3.1` installations should upgrade to `0.3.2` for the capability-discovery tool, read-only projections, and security improvements.
