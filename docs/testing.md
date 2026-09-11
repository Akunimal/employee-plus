# Verification strategy

The current local gate is:

- `node node_modules/typescript/bin/tsc -b --pretty false`
- `node node_modules/vitest/vitest.mjs run --config vitest.config.ts`
- MCP `initialize`, `tools/list` and `tools/call` against `/mcp` with `MCP-Protocol-Version: 2025-11-25`
- app typecheck and Vite build

Before submission, add MCP Inspector and Alexa+ Local Inspector artifacts under `docs/evidence/` after sanitizing account, token, address and device identifiers. The security matrix must cover invalid input, unauthorized access, cross-user reads, replay, idempotency, stale version and dependency failure for every tool.
