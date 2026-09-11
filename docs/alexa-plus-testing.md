# How to test Employee+ with Alexa+

The test sequence is intentionally staged. Alexa+ does not call a private laptop directly; the final end-to-end test needs a deployed HTTPS MCP endpoint and an add-on deployed to the development stage.

## 1. Local server and automated smoke test

From the repository root:

```powershell
pnpm install --ignore-scripts
pnpm build
pnpm test:mcp
```

The smoke test negotiates MCP `2025-11-25`, discovers all 11 base tools, calls `get_home_brief`, and verifies that an untrusted Origin receives `403`.

For interactive MCP validation, run the standard MCP Inspector against `http://127.0.0.1:3000/mcp`. If the official Alexa+ Local Inspector is available in the Alexa developer environment, run its CLI against the same local endpoint or its localhost proxy. Visual mode requires the UI resource and Playwright; data-layer mode does not.

## 2. Deploy a development endpoint

Use the AWS CDK stack only after choosing the target account and an available region. The stack defaults to `us-east-2` for this account, but `CDK_DEFAULT_REGION` can override it; the hackathon does not require a particular AWS region. Push the container to ECR, deploy App Runner, and replace the example domain in `addon-package/addon.json` with the real HTTPS URL. Do not put tokens or personal addresses in traces.

## 3. Connect the add-on

After signing in to the Alexa developer environment, install and configure the official Alexa AI CLI, then run:

```powershell
alexa-ai configure
alexa-ai deploy
```

The package must include the completed short/full descriptions, example phrases, privacy/terms URLs, media assets and account-linking configuration. Alexa+ refreshes MCP tools on deployment, so redeploy after changing tools or resources.

## 4. End-to-end test

Use the Alexa+ Web Simulator to exercise:

1. “Ask Employee Plus what my home needs this week.”
2. “Ask Employee Plus to compare repair options.”
3. “Ask Employee Plus to move my service appointment.”
4. Confirm that the appointment is changed only after an explicit confirmation.

If R0 and M5 pass with the official Ring simulator/API, add the Ring phrase and capture the temporal-match response. Otherwise test cancellation, the simulated document and audit evidence instead. A physical Alexa device is optional.

## 5. Evidence

Store sanitized `inspection-summary.json`, `certification-verdict.json`, MCP traces and screenshots under `docs/evidence/`. The submission video must show the real MCP endpoint and stay under the hackathon limit.
