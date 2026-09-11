# Employee+

Employee+ is a consumer home-care concierge for Alexa+. It helps people understand what their home needs, compare service options, schedule or change a visit, and keep a clear record of completed work.

The project is being built as a greenfield implementation for the Amazon Developer Hackathon. Its product requirements are informed by the author's prior experience with personal automation projects, but no source code, assets, or implementation files were copied from those projects.

## Status

Pre-alpha. The repository is intentionally initialized with the public product contract and delivery roadmap before implementation begins.

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

## License

Apache-2.0. See [LICENSE](LICENSE).

