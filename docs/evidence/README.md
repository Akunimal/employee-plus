# Evidence guide

Evidence in this directory is classified so a reviewer can distinguish local
simulation, remote smoke validation, and official platform validation.

- `mcp-tools-list.json`, `mcp-ui-resource.json`, and `alexa-data-layer.json`
  document the local MCP contract and UI resource.
- `remote-deployment.json` documents the public ECS HTTPS smoke test. Its image
  tag must be refreshed after the final source commit is deployed.
- `container-smoke.json` documents the final ECR image running locally through
  the Ubuntu WSL Docker Engine.
- `simulated-alexa-experience.json` documents the accepted local Alexa+
  simulation path.
- Official Alexa+ Inspector and Web Simulator captures are intentionally not
  present because the AWS account is not enabled for the private Preview. Do
  not create synthetic pass/fail files for those tools.
