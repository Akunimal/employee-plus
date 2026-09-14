# Employee+

Employee+ is a consumer home-care concierge for Alexa+. It helps people understand what their home needs, compare service options, schedule or change a visit, and keep a clear record of completed work.

The project is being built as a greenfield implementation for the Amazon Developer Hackathon. Its product requirements are informed by the author's prior experience with personal automation projects, but no source code, assets, or implementation files were copied from those projects.

## Status

The local vertical slice is executable: strict contracts, deterministic workflows, two-step confirmation, idempotent booking, a real MCP Streamable HTTP endpoint, Ring webhook primitives, a MCP App board, and a CDK infrastructure scaffold. The repository also includes a clearly labeled simulated Alexa+ experience for the hackathon's accepted simulation route. AWS account linking and the official Ring gate remain environment-dependent and are not presented as completed capabilities.

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

The local MCP endpoint is `http://localhost:3000/mcp`. The fixture transport accepts `x-employee-user-id` outside production for deterministic tests; production requires a Cognito access-token bearer header and uses the verified token subject as the tenant identity.

## Recording demo

The impact-focused demo host lives in `apps/video-demo`. It is a separate visual shell for recording the Alexa+ simulated experience; its conversation and board actions call the local MCP tools with the deterministic `video-demo` user.

Run the MCP server in one terminal and the demo host in another:

```powershell
pnpm dev
pnpm demo
```

Open `http://127.0.0.1:5173/`. The flow is: home brief, compare quotes, select a provider, prepare and explicitly confirm a booking, then prepare and confirm a date change. The top label and footer make the simulated Alexa+ and synthetic-data boundaries visible for recording.

The `Reset scene` control is development-only and is never exposed by the production MCP server.

## Demo video renderer

The short submission video is generated with Remotion from `apps/video-renderer`. It is intentionally separate from the product runtime and renders an honest simulated Alexa+ story with embedded English subtitles. VoiceStudio is used locally only to generate the narration; its source code is not copied into this repository.

```powershell
# Start VoiceStudio locally, then generate one narration track.
pnpm video:voice

# Open Remotion Studio for timing and visual review.
pnpm video:studio

# Render artifacts/employee-plus-demo.mp4.
pnpm video:render
```

VoiceStudio's local API is expected at `http://127.0.0.1:3900`. If clips are not present, Remotion still renders a subtitle-only review video so the visual edit can be validated first.

## Submission materials

- [Submission checklist](docs/submission.md)
- [Product feedback](docs/product-feedback.md)
- [Friction log](docs/friction-log.md)
- [Open Source mini challenge notes](docs/open-source-submission.md)
- [Evidence notes](docs/evidence/README.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
