import * as cdk from "aws-cdk-lib";
import { EmployeePlusStack } from "../lib/employee-plus-stack.js";

const app = new cdk.App();
new EmployeePlusStack(app, "EmployeePlusStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "us-east-1" },
  description: "Employee+ secure event-driven Alexa+ MCP add-on infrastructure",
});
