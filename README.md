# Employee+

Employee+ is a consumer home-care concierge for Alexa+. It helps people understand what their home needs, compare service options, schedule or change a visit, and keep a clear record of completed work.

The project is being built as a greenfield implementation for the Amazon Developer Hackathon. Its product requirements are informed by the author's prior experience with personal automation projects, but no source code, assets, or implementation files were copied from those projects.

## Status

The local vertical slice is executable: strict contracts, deterministic workflows, two-step confirmation, idempotent booking, a real MCP Streamable HTTP endpoint, Ring webhook primitives, a MCP App board, and a CDK infrastructure scaffold. AWS account linking and the official Ring gate remain environment-dependent.

## Planned experience

Employee+ will expose a self-hosted MCP server over Streamable HTTP for Alexa+, with an optional Ring integration that correlates an official Ring event with a scheduled home-service visit. The Ring capability will only be enabled after the official developer account, OAuth flow, and simulator/API path have been verified.

The MVP uses synthetic households, providers, bookings, quotes, and documents. Any invoice-like document is visibly marked `SIMULATED — NOT A TAX DOCUMENT`; no payment, AFIP, access-control, face recognition, audio, or video processing is included.

## Tracks

- Primary: Alexa+
- Conditional second track: Ring
- Mini challenges: AWS Builder and Open Source

## Greenfield boundary

Employee+ is implemented from scratch in this repository. Personal projects may inform product lessons such as explicit confirmation, durable state, idempotency, and auditability, but they are not runtime dependencies, code sources, or referenced implementations.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for milestones, gates, testing requirements, Ring eligibility checks, and submission preparation.

## Local verification

```powershell
pnpm install --ignore-scripts
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vitest/vitest.mjs run --config vitest.config.ts
pnpm test:mcp
node node_modules/typescript/bin/tsc -p apps/mcp-app/tsconfig.json --pretty false
pnpm --filter @employee-plus/mcp-app exec vite build
pnpm dev
```

The local MCP endpoint is `http://localhost:3000/mcp`. The fixture transport accepts `x-employee-user-id` for development only; production must use the planned Cognito OAuth boundary.

## License

Apache-2.0. See [LICENSE](LICENSE).
