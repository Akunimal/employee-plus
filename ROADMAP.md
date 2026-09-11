# Employee+ Roadmap

This document is the execution contract for the greenfield Employee+ implementation.

## M0 — Public greenfield foundation

Status: complete when the initial public commit is pushed.

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

## M1 — Contracts and deterministic domain

- Define Zod/JSON Schema contracts for the home-care tools.
- Implement synthetic homes, assets, providers, quotes, bookings, and simulated documents.
- Add two-step prepare/confirm flows, optimistic versions, expiration, idempotency, and audit events.

Gate: contract, unit, and state-machine tests pass.

Commit: `feat(contracts): define Employee+ consumer workflows`

## M2 — MCP server

- Expose the contracts through MCP SDK 2.x.
- Serve Streamable HTTP at `/mcp`.
- Support and test MCP `2025-11-25`.
- Validate Origin, protocol headers, payload size, scopes, and errors.
- Add resources and a health/readiness surface.

Gate: MCP Inspector can list and invoke every published tool.

Commit: `feat(mcp): expose Employee+ through Streamable HTTP`

## M3 — AWS and account linking

- Deploy the server to App Runner through ECR.
- Add Cognito Authorization Code + PKCE S256.
- Add DynamoDB persistence, Streams, EventBridge Pipes, SQS/DLQ, Lambda, S3, KMS, Secrets Manager, CloudWatch, and X-Ray.
- Keep Bedrock asynchronous and outside the critical transaction path.

Gate: remote HTTPS endpoint, linked-user isolation, reproducible CDK deployment, and failure recovery.

Commit: `feat(aws): deploy secure event-driven infrastructure`

## M4 — Alexa+ and MCP App

- Create the Alexa+ MCP Toolkit package with the official CLI/Agent Skill.
- Add account-linking metadata, store text, privacy URL, terms URL, icon, carousel image, and four tested phrases.
- Build the Home Care Board using MCP Apps.
- Support voice-only, small display, large display, light mode, and dark mode.

Gate: development add-on deployed and every advertised capability works.

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

