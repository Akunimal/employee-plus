# How to test Employee+ with Alexa+

The test sequence is intentionally staged. The primary implementation is a
self-hosted HTTPS MCP endpoint. The hackathon also accepts a clearly shown
simulated Alexa+ experience, so the local recording route remains valid when
the private Alexa+ Preview is unavailable.

## 1. Local server and automated smoke test

From the repository root:

```powershell
pnpm install --ignore-scripts
pnpm build
pnpm test:mcp
```

The smoke test negotiates MCP `2025-11-25`, discovers all 13 base tools, calls `get_home_brief`, and verifies that an untrusted Origin receives `403`.

For interactive MCP validation, run the standard MCP Inspector against `http://127.0.0.1:3000/mcp`. If the official Alexa+ Local Inspector is available in the Alexa developer environment, run its CLI against the same local endpoint or its localhost proxy. Visual mode requires the UI resource and Playwright; data-layer mode does not.

## 2. Deploy a development endpoint

Use the AWS CDK stack only after choosing the target account and an available region. The stack defaults to `us-east-2` for this account, but `CDK_DEFAULT_REGION` can override it; the hackathon does not require a particular AWS region. Bootstrap the account, deploy the data plane with `DEPLOY_SERVICE=false`, then run:

```powershell
./scripts/deploy-employee-plus.ps1 -Profile employee-plus -Region us-east-2
```

The script builds and pushes an immutable image tag, deploys ECS Express Mode, and prints the HTTPS endpoint. Keep `addon-package/addon.json` aligned with the deployed endpoint. Do not put tokens or personal addresses in traces.

## 3. Connect the add-on when Preview is available

After signing in to the Alexa developer environment, install and configure the official Alexa AI CLI, then run:

The CLI is distributed through Amazon CodeArtifact, not the public npm registry. The Alexa developer setup provides an `alexa-ai` AWS profile for that private registry. Do not place access keys, CodeArtifact tokens or Alexa credentials in this repository.

```powershell
aws codeartifact login --tool npm --domain alexa-ai --repository npm-packages --domain-owner 372468808636 --region us-west-2 --namespace @alexa-ai --profile alexa-ai
npm install --global @alexa-ai/cli
alexa-ai --version
alexa-ai configure
```

The `alexa-ai` profile is separate from the Employee+ infrastructure profile. The setup must be completed in the Alexa Developer Console before the commands above can succeed.

```powershell
alexa-ai deploy
```

The package must include the completed short/full descriptions, example phrases, privacy/terms URLs, media assets and account-linking configuration. Alexa+ refreshes MCP tools on deployment, so redeploy after changing tools or resources.

This step is optional for the accepted simulated route. Do not invent a private
registry token or claim that the add-on was deployed if the account is not
enabled for Preview.

## 4. End-to-end test

Use the Alexa+ Web Simulator to exercise:

1. “Ask Employee Plus what my home needs this week.”
2. “Ask Employee Plus to compare repair options.”
3. “Ask Employee Plus to move my service appointment.”
4. “Ask Employee Plus to cancel my service appointment.”
5. Confirm that changes and cancellations occur only after explicit confirmation.

If R0 and M5 pass with the official Ring simulator/API, add the Ring phrase and capture the temporal-match response. Otherwise test cancellation, the simulated document and audit evidence instead. A physical Alexa device is optional.

When official Preview access is unavailable, run the equivalent flow through
`apps/video-demo` after starting the local MCP server:

```powershell
pnpm dev
pnpm demo
```

The shell is visibly labeled as a simulated Alexa+ experience and calls the
same deterministic MCP tools used by the product runtime.

## 5. Evidence

Store sanitized MCP traces and simulation evidence under `docs/evidence/`.
Only add official Inspector or Web Simulator verdicts when they were actually
run. The submission video must show the simulated Alexa+ experience clearly
and stay under the hackathon limit.
