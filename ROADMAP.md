# Employee+ Roadmap

This document is the execution contract for the greenfield Employee+ implementation.

## M0 — Public greenfield foundation

Status: complete. The initial public commit is pushed.

- Public repository under `Akunimal/employee-plus`.
- English README, Apache-2.0 license, security and contribution policy.
- No personal project source, generated analysis, credentials, or build output tracked.

Commit: `chore: initialize Employee+ greenfield project`

## R0 — Ring feasibility gate

Deadline: before the first implementation week is completed.

- Create a Ring Developer test application.
- Verify OAuth and the available test account/simulator path.
- Discover at least one device.
- Receive and verify one official event or webhook.
- Capture a sanitized trace.

If this gate fails, Ring remains disabled and no Ring claim is included in the submission. Alexa+ remains the complete primary delivery.

## M1 — Contracts and deterministic domain — COMPLETE

- Define Zod/JSON Schema contracts for the home-care tools.
- Implement synthetic homes, assets, providers, quotes, bookings, and simulated documents.
- Add two-step prepare/confirm flows, optimistic versions, expiration, idempotency, and audit events.

Gate: contract, unit, and state-machine tests pass.

Commit: `feat(contracts): define Employee+ consumer workflows`

## M2 — MCP server — COMPLETE

- Expose the contracts through MCP SDK 2.x.
- Serve Streamable HTTP at `/mcp`.
- Support and test MCP `2025-11-25`.
- Validate Origin, protocol headers, payload size, scopes, and errors.
- Add resources and a health/readiness surface.

Gate: MCP Inspector can list and invoke every published tool.

Local evidence: `initialize`, `tools/list`, and `tools/call` passed against `/mcp` with `MCP-Protocol-Version: 2025-11-25`. The conditional Ring tool is absent unless both Ring flags are true.

Remote evidence: the deployed endpoint passes live/ready checks, publishes
OAuth protected-resource metadata, rejects invalid Origin with `403`, and
rejects anonymous MCP with `401`.

Commit: `feat(mcp): expose Employee+ through Streamable HTTP`

## M3 — AWS and account linking — DEPLOYED / ALEXA PREVIEW BLOCKED

- Deploy the server to ECS Express Mode through an immutable ECR image.
- Add Cognito Authorization Code + PKCE S256.
- Add DynamoDB persistence, Streams, EventBridge Pipes, SQS/DLQ, Lambda, S3, KMS, Secrets Manager, CloudWatch, and X-Ray.
- Keep Bedrock asynchronous and outside the critical transaction path.

Foundation gate progress: the encrypted data plane and ECS Express Mode service
are deployed in `us-east-2` with immutable image tag `cdb331d`. Production
runtime uses Cognito JWT validation and DynamoDB-backed state. Alexa+ account
linking cannot be completed until Amazon enables this account for MCP Preview.

Gate: remote HTTPS endpoint, linked-user isolation, reproducible CDK deployment, and failure recovery.

Commit: `feat(aws): deploy secure event-driven infrastructure`

## M4 — Alexa+ and MCP App — CODE READY / PREVIEW ACCESS PENDING

- Create the Alexa+ MCP Toolkit package with the official CLI/Agent Skill.
- Add account-linking metadata, store text, privacy URL, terms URL, icon, carousel image, and four tested phrases.
- Build the Home Care Board using MCP Apps.
- Support voice-only, small display, large display, light mode, and dark mode.

Gate: development add-on deployed and every advertised capability works. The
code and remote MCP endpoint are ready; Amazon Preview enablement is the only
external blocker for the official Alexa+ inspectors and Web Simulator.

Commit: `feat(alexa): add Employee+ multimodal experience`

## M5 — Ring extension, only after R0

- Implement a `RingGateway` adapter, OAuth token storage, device discovery, signed event verification, deduplication, and time-window correlation.
- Expose `get_service_arrival_context` only when `RING_ENABLED=true` and the Ring health check passes.
- Store event metadata only; never store video/audio or infer identity.

Gate: official Ring simulator/API event is visible in Employee+ and duplicates/out-of-window events are handled correctly.

Commit: `feat(ring): correlate Ring events with scheduled service visits`

## M6 — Readiness and submission

- Run MCP Inspector and Alexa+ Local Inspector data-layer and visual checks.
- Test Alexa+ Web Simulator end to end.
- Add Playwright, axe, load, security, dependency, secret, SBOM, and container checks.
- Prepare product feedback, friction logs, feature requests, demo video, and Devpost submission.

Commits:

- `test(alexa): add production readiness evidence`
- `test: harden security performance and cross-device flows`
- `docs: prepare Amazon Developer Hackathon submission`

Internal freeze: 22 October 2026, 18:00 ART.
