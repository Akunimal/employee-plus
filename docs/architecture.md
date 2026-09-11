# Employee+ architecture

Employee+ is deliberately split into contracts, deterministic domain workflows, adapters and transport. The domain never depends on Alexa+, Ring, Bedrock or AWS, which makes the consumer journey testable offline and keeps probabilistic text generation out of money, identity and booking decisions.

```text
Alexa+ / MCP App
        |
Streamable HTTP + OAuth boundary
        |
MCP tools/resources -> EmployeeDomain -> repository interfaces
                                      |
                         DynamoDB transaction + audit event
                                      |
                         Streams -> EventBridge -> SQS/DLQ
                                      |
                         Lambda -> Bedrock/S3 (non-critical enrichment)
```

The local implementation uses a fixture store so the entire happy path can run without hardware or AWS credentials. Production adapters will replace that store behind the same domain boundary.

Ring is not enabled by default. The tool and resource are registered only after the official developer/simulator account, OAuth, device discovery and signed event checks in R0 have passed.
