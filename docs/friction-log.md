# Friction log

These entries are written for the hackathon submission. They contain no
credentials, tokens, private email content, or personal addresses.

## 1. Alexa+ MCP Preview onboarding

- **Tool/API:** Alexa AI CLI and private MCP Preview registry
- **Date:** 2026-09-14
- **Task attempted:** Start the official Alexa+ MCP Toolkit setup and sign in
  to the private package registry.
- **Steps:** Created the AWS/developer setup, attempted the role assumption,
  and retried the setup after confirming the account and region.
- **Expected:** The registered AWS account could assume the read role and
  install the CLI package.
- **Actual:** The role assumption returned `AccessDenied`; Amazon support
  confirmed that account `796429457584` is not enabled for the phased MCP
  Preview.
- **Severity:** High
- **Workaround:** Implemented and tested the self-hosted MCP server and used a
  clearly labeled local Alexa+ simulation for the video and consumer flow.
- **Actionable suggestion:** Provide a self-serve Preview eligibility check,
  a public test tenant, or a local inspector package that does not depend on
  private registry access.

## 2. Docker Desktop local daemon

- **Tool/API:** Docker Desktop on Windows
- **Date:** 2026-09-14
- **Task attempted:** Build and run the Employee+ container locally.
- **Steps:** Started Docker Desktop and retried after a factory reset.
- **Expected:** The Docker Engine would expose the standard Windows Docker
  pipe and accept the build.
- **Actual:** Docker Desktop repeatedly failed while binding its internal
  `sailor-ingest.sock` listener. The local `docker info` check currently cannot
  find the `docker_engine` pipe.
- **Severity:** Medium
- **Workaround:** The GitHub Actions container job builds the Dockerfile
  successfully; local MCP and remote HTTPS smoke tests remain available.
- **Actionable suggestion:** Expose a diagnostic that identifies the process
  holding the internal socket and offers a supported service-only recovery
  path without requiring a full factory reset.

## 3. Self-contained MCP App resource

- **Tool/API:** MCP Apps UI resource
- **Date:** 2026-09-11
- **Task attempted:** Load the Home Care Board from `ui://employee/home-care-board`.
- **Steps:** Built the React/Vite app, served the initial resource, and checked
  it with the MCP smoke harness.
- **Expected:** The resource would render without depending on the standalone
  Vite development server or external CSS and JavaScript files.
- **Actual:** The first implementation exposed a placeholder HTML surface and
  external build references. The app could not be treated as a portable MCP
  resource.
- **Severity:** Medium
- **Workaround:** Added a reproducible inline build and a test that rejects
  external script and stylesheet references.
- **Actionable suggestion:** Include a first-party MCP Apps packaging example
  that demonstrates a self-contained production resource and its tool metadata.
