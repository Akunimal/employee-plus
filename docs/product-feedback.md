# Product feedback

This is the English feedback draft for the Amazon Developer Hackathon submission.
It describes the tools actually used by Employee+ and separates working paths
from capabilities that remain optional or environment-dependent.

## MCP SDK and self-hosted Streamable HTTP

**What we used:** TypeScript MCP SDK 2.x, MCP protocol `2025-11-25`, Streamable
HTTP at `/mcp`, JSON Schema contracts, resources, tool annotations, and Origin
validation.

**What worked well:** The protocol made the boundary between deterministic
home-service workflows and the agent clear. The same contracts drive local
tests, the MCP App resource, the remote service, and the simulated Alexa+
experience. The conformance smoke test discovers 13 tools, verifies the UI
resource, rejects an invalid Origin, and rejects anonymous production access.

**What needs work:** The Alexa+ Preview onboarding path is not available to
every AWS account. The private CLI registry and official inspector therefore
cannot be tested by an account that has not been enabled. A public, self-serve
MCP Preview sandbox would make onboarding and reproducible testing easier.

**Onboarding:** Local MCP hello world was straightforward after the repository
was installed. Remote validation required Cognito, HTTPS, and an explicit
Origin policy.

**Would we build with it again?** Yes. The protocol is a good fit for a
consumer workflow that needs durable state and explicit confirmation.

## MCP Apps UI

**What we used:** MCP Apps-compatible `ui://employee/home-care-board` resource,
self-contained HTML, React, Vite, structured tool content, and responsive
small/large plus light/dark UI states.

**What worked well:** Inlining CSS and JavaScript makes the UI resource
portable and removes external asset dependencies. The board keeps the voice
conversation, quote comparison, confirmation state, and booking context in one
visual surface.

**What needs work:** Official Alexa+ visual inspection requires Preview access.
Local visual validation is available, but it cannot replace the official
device-side renderer.

**Onboarding:** The local app was easy to iterate on with Vite and the MCP
resource was easy to inspect once the inline-resource check was added.

**Would we build with it again?** Yes. Multimodal state is materially clearer
than a voice-only booking confirmation.

## AWS services and AWS Builder mini challenge

**What we used and why:**

- ECS Express Mode hosts the remote MCP service.
- ECR stores immutable, encrypted container images with image scanning enabled.
- Cognito provides the OAuth authorization-code and PKCE account-linking boundary.
- DynamoDB stores durable state, versioned drafts, idempotency keys, audit data,
  TTL metadata, and Streams.
- SQS and a dead-letter queue provide asynchronous event handling.
- Lambda consumes asynchronous work without placing it in the booking critical
  path.
- S3 stores simulated service documents privately with encryption, versioning,
  and lifecycle retention.
- KMS encrypts data and service secrets.
- CloudWatch Logs and X-Ray-compatible runtime hooks support operations.
- AWS CDK defines the infrastructure reproducibly.

Bedrock is permissioned as an optional asynchronous enrichment path in the
infrastructure, but it is not required for the critical booking transaction
and is not presented as a live dependency in the demo.

**What worked well:** CDK kept the data plane, IAM grants, encrypted storage,
and immutable ECR policy reviewable in one source tree. The remote smoke test
proves the service is reachable over HTTPS and rejects unsafe anonymous or
cross-origin requests.

**What needs work:** ECS Express Mode and account linking still require an
account with the appropriate service permissions. A small-cost hackathon
reference stack with automatic cleanup would make experimentation safer.

**Onboarding:** AWS account setup and region selection were uncomplicated;
the main friction was ensuring that local credentials, ECR, Docker, and CDK
were aligned.

**Would we build with these services again?** Yes. The combination gives the
project durable state and a credible deployment story without putting an AI
model in the path of a financial or scheduling mutation.

## Remotion and VoiceStudio

**What we used:** Remotion for the original visual demo composition and a
local VoiceStudio-generated English narration track. The renderer is separate
from the product runtime and the repository does not copy VoiceStudio source.

**What worked well:** A single master track using the same Demo Voice profile
keeps the narration consistent. The final composition is 76 seconds with
embedded subtitles and no external media dependencies.

**What needs work:** The final video still requires a human listening pass and
public YouTube or Vimeo upload. Any external project license and voice-profile
terms must be retained and respected before publication.

**Would we use them again?** Yes for a short, accessible hackathon demo, with
the licensing and pronunciation review kept as an explicit release gate.
