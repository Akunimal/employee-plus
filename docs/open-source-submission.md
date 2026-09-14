# Open Source mini challenge notes

These values are ready to paste into the Devpost Open Source mini challenge
field.

- **Contribution URL:** https://github.com/Akunimal/employee-plus
- **Project repository URL:** https://github.com/Akunimal/employee-plus
- **GitHub username:** Akunimal
- **Contribution type:** New public repository created during the hackathon
  window.
- **License:** Apache-2.0, visible in `LICENSE` at the repository root.
- **What was done:** Built Employee+ from scratch as a consumer home-care
  concierge with strict contracts, deterministic workflows, explicit
  confirmation, idempotency, a self-hosted MCP server, MCP App UI, AWS CDK
  infrastructure, tests, and reproducible local setup instructions.
- **How it works:** The MCP server exposes read tools, prepare/confirm booking
  tools, resources, and a self-contained UI resource. The local simulated
  Alexa+ shell calls those tools and visibly demonstrates comparison,
  confirmation, booking, and a context-preserving date change.
- **Why it matters:** The repository provides a reusable, auditable example of
  a multimodal consumer workflow in which an agent can prepare an action but
  cannot silently commit a booking.
