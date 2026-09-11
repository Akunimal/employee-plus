# Verification strategy

The current local gate is:

- `node node_modules/typescript/bin/tsc -b --pretty false`
- `node node_modules/vitest/vitest.mjs run --config vitest.config.ts`
- MCP `initialize`, `tools/list` and `tools/call` against `/mcp` with `MCP-Protocol-Version: 2025-11-25`
- app typecheck and Vite build

## Container verification without Docker Desktop

On Windows, the repository can be built with the native Docker Engine in the
Ubuntu WSL distribution. This avoids Docker Desktop runtime state and keeps the
verification path reproducible for Linux containers:

```powershell
wsl -d Ubuntu -- docker buildx build --load -t employee-plus:local .
wsl -d Ubuntu -- docker run --rm -d --name employee-plus-smoke -p 3310:3000 -e NODE_ENV=test employee-plus:local
Invoke-WebRequest http://127.0.0.1:3310/health/live
Invoke-WebRequest http://127.0.0.1:3310/health/ready
wsl -d Ubuntu -- docker rm -f employee-plus-smoke
```

The container gate must also verify MCP initialization, the published tool
metadata, the self-contained `ui://employee/home-care-board` resource, and the
413 response for an oversized request. Do not put credentials or production
tokens in this local test.

Before submission, add MCP Inspector and Alexa+ Local Inspector artifacts under `docs/evidence/` after sanitizing account, token, address and device identifiers. The security matrix must cover invalid input, unauthorized access, cross-user reads, replay, idempotency, stale version and dependency failure for every tool.

## Remote deployment smoke test

The deployed service can be checked without credentials. This validates the
public health and OAuth metadata routes, rejects an untrusted Origin, and
confirms that MCP is not anonymously accessible:

```powershell
$env:EMPLOYEE_PLUS_ENDPOINT = "https://<service-endpoint>"
pnpm test:remote
Remove-Item Env:EMPLOYEE_PLUS_ENDPOINT
```

Authenticated `tools/list`, `resources/list` and `resources/read` remain gated
on a Cognito test user or the Alexa+ Preview account. Do not bypass that gate
with fabricated tokens.
