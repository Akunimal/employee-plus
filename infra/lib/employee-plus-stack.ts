import * as cdk from "aws-cdk-lib";
import { aws_apprunner as apprunner, aws_cognito as cognito, aws_dynamodb as dynamodb, aws_ecr as ecr, aws_events as eventsModule, aws_events_targets as eventTargets, aws_iam as iam, aws_kms as kms, aws_lambda as lambda, aws_lambda_event_sources as eventSources, aws_logs as logs, aws_s3 as s3, aws_sqs as sqs } from "aws-cdk-lib";
import { Construct } from "constructs";

export class EmployeePlusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, "EmployeePlusDataKey", { enableKeyRotation: true, alias: "alias/employee-plus-data" });
    const table = new dynamodb.Table(this, "EmployeePlusState", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      timeToLiveAttribute: "expiresAt",
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const eventsDlq = new sqs.Queue(this, "EventsDlq", { encryption: sqs.QueueEncryption.KMS, encryptionMasterKey: key, retentionPeriod: cdk.Duration.days(14) });
    const events = new sqs.Queue(this, "Events", { encryption: sqs.QueueEncryption.KMS, encryptionMasterKey: key, deadLetterQueue: { queue: eventsDlq, maxReceiveCount: 3 }, visibilityTimeout: cdk.Duration.seconds(120) });
    const documents = new s3.Bucket(this, "Documents", { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, enforceSSL: true, encryption: s3.BucketEncryption.KMS, encryptionKey: key, versioned: true, lifecycleRules: [{ expiration: cdk.Duration.days(30) }], removalPolicy: cdk.RemovalPolicy.RETAIN });
    const repository = new ecr.Repository(this, "McpRepository", { imageScanOnPush: true, encryption: ecr.RepositoryEncryption.KMS, encryptionKey: key, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const logGroup = new logs.LogGroup(this, "McpLogs", { retention: logs.RetentionDays.ONE_MONTH, encryptionKey: key, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const userPool = new cognito.UserPool(this, "Users", { selfSignUpEnabled: false, signInAliases: { email: true }, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const readScope = new cognito.ResourceServerScope({ scopeName: "read", scopeDescription: "Read home data" });
    const manageScope = new cognito.ResourceServerScope({ scopeName: "manage", scopeDescription: "Manage appointments" });
    const resourceServer = userPool.addResourceServer("EmployeePlusResourceServer", { identifier: "employee", scopes: [readScope, manageScope] });
    const client = userPool.addClient("AlexaPlusClient", { generateSecret: false, oAuth: { flows: { authorizationCodeGrant: true }, scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.resourceServer(resourceServer, readScope), cognito.OAuthScope.resourceServer(resourceServer, manageScope)] } });
    const runtimeRole = new iam.Role(this, "RuntimeRole", { assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com") });
    const appRunnerAccessRole = new iam.Role(this, "AppRunnerAccessRole", { assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com") });
    repository.grantPull(appRunnerAccessRole);
    table.grantReadWriteData(runtimeRole); documents.grantReadWrite(runtimeRole); events.grantSendMessages(runtimeRole); key.grantEncryptDecrypt(runtimeRole);
    runtimeRole.addToPolicy(new iam.PolicyStatement({ actions: ["bedrock:InvokeModel"], resources: ["arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0"] }));

    const streamRule = new eventsModule.Rule(this, "StateChangeRule", { eventPattern: { source: ["employee-plus.domain"], detailType: ["EmployeePlusStateChanged"] } });
    streamRule.addTarget(new eventTargets.SqsQueue(events));
    const enrichment = new lambda.Function(this, "AsyncEnrichment", { runtime: lambda.Runtime.NODEJS_22_X, handler: "index.handler", timeout: cdk.Duration.seconds(30), code: lambda.Code.fromInline("exports.handler = async (event) => { console.log(JSON.stringify({ records: event.Records?.length ?? 0 })); };"), environment: { BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0" } });
    events.grantConsumeMessages(enrichment);
    enrichment.addEventSource(new eventSources.SqsEventSource(events, { batchSize: 10, reportBatchItemFailures: true }));

    const service = new apprunner.CfnService(this, "McpService", { serviceName: "employee-plus-mcp", sourceConfiguration: { autoDeploymentsEnabled: false, authenticationConfiguration: { accessRoleArn: appRunnerAccessRole.roleArn }, imageRepository: { imageIdentifier: `${repository.repositoryUri}:latest`, imageRepositoryType: "ECR", imageConfiguration: { port: "3000", runtimeEnvironmentVariables: [{ name: "NODE_ENV", value: "production" }, { name: "RING_ENABLED", value: "false" }] } } }, instanceConfiguration: { cpu: "1 vCPU", memory: "2 GB", instanceRoleArn: runtimeRole.roleArn }, healthCheckConfiguration: { path: "/health/ready", protocol: "HTTP", interval: 10, timeout: 5, healthyThreshold: 2, unhealthyThreshold: 5 } });
    service.addResourceDependency(repository);

    new cdk.CfnOutput(this, "StateTableName", { value: table.tableName });
    new cdk.CfnOutput(this, "EventsQueueUrl", { value: events.queueUrl });
    new cdk.CfnOutput(this, "DocumentsBucketName", { value: documents.bucketName });
    new cdk.CfnOutput(this, "McpRepositoryUri", { value: repository.repositoryUri });
    new cdk.CfnOutput(this, "LogGroupName", { value: logGroup.logGroupName });
    new cdk.CfnOutput(this, "RuntimeRoleArn", { value: runtimeRole.roleArn });
    new cdk.CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "CognitoClientId", { value: client.userPoolClientId });
    new cdk.CfnOutput(this, "AppRunnerServiceArn", { value: service.attrServiceArn });
  }
}
