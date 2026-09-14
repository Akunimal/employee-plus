# Hackathon submission checklist

## Chosen eligibility route

Employee+ submits the Alexa+ primary track. The repository contains a self-hosted MCP server implementing MCP `2025-11-25` over Streamable HTTP, and it also contains a clearly labeled simulated Alexa+ experience in `apps/video-demo`. The simulation is the recording and testing path while the account is not enabled for the private Alexa+ Preview. It does not claim official Alexa+ certification or Preview access.

Ring is not part of this submission. No Ring claim, track selection, or Ring footage should be added unless the official Ring R0 gate and implementation gate pass.

## Required submission fields

- [ ] Join the hackathon and submit before **October 23, 2026 at 12:00 PM PDT**.
- [x] Select Alexa+ as the primary track.
- [ ] Select AWS Builder only after copying the documented AWS service usage from [Product feedback](product-feedback.md).
- [ ] Select Open Source and provide the details from [Open Source mini challenge notes](open-source-submission.md).
- [ ] Use the public repository: `https://github.com/Akunimal/employee-plus`.
- [x] Keep the Apache-2.0 license visible at the repository root.
- [x] Keep setup and run instructions in the English README.
- [x] Keep the endpoint, privacy URL, terms URL, and account-linking metadata in `addon-package/addon.json`.
- [ ] Upload the final English demo video publicly to YouTube or Vimeo and paste its URL into Devpost.
- [ ] Paste the final English project description and product feedback.
- [ ] Paste the friction log entries. Do not include credentials, tokens, private email content, or personal addresses.

The official rules list up to **$150 in AWS Promotional Credits**, while
supplies last, with the request form closing on October 21, 2026 at 12:00 PM
PDT. This is separate from any AWS account credit activity and does not change
the project's eligibility route.

## Video acceptance checklist

- [x] Current local cut is 76 seconds, below the three-minute limit.
- [x] The cut has English narration and embedded English subtitles.
- [x] The video labels the experience as simulated Alexa+ and uses synthetic service data.
- [x] The story shows the consumer need, comparison, explicit confirmation, durable booking, and context-preserving date change.
- [ ] Watch the final export muted and at 720p for legibility.
- [ ] Confirm the final upload is publicly visible and contains no copyrighted music or unlicensed material.

## Evidence policy

The local MCP and remote smoke evidence is included in `docs/evidence/`. Official Alexa+ Inspector and Web Simulator captures are optional validation artifacts for this chosen simulation route and must not be fabricated. If Preview access arrives, add sanitized captures there and update this checklist.

## Final claims boundary

Use these claims: original greenfield implementation, self-hosted MCP runtime, simulated Alexa+ experience, AWS-backed deployment, synthetic data, explicit confirmation, and no real payments. Do not claim official Alexa+ Preview enablement, certification, Ring integration, real service fulfillment, identity verification, or payment processing.
