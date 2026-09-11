import * as cdk from "aws-cdk-lib";
import { aws_cognito as cognito, aws_dynamodb as dynamodb, aws_ecr as ecr, aws_ecs as ecs, aws_events as eventsModule, aws_events_targets as eventTargets, aws_iam as iam, aws_kms as kms, aws_lambda as lambda, aws_lambda_event_sources as eventSources, aws_logs as logs, aws_s3 as s3, aws_secretsmanager as secretsmanager, aws_sqs as sqs } from "aws-cdk-lib";
import { Construct } from "constructs";

export class EmployeePlusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const deployService = process.env.DEPLOY_SERVICE === "true";
    const imageTag = process.env.IMAGE_TAG ?? "latest";

    const key = new kms.Key(this, "EmployeePlusDataKey", { enableKeyRotation: true, alias: "alias/employee-plus-data" });
    const secretsKey = new kms.Key(this, "EmployeePlusSecretsKey", { enableKeyRotation: true, alias: "alias/employee-plus-secrets" });
    secretsKey.addToResourcePolicy(new iam.PolicyStatement({
      sid: "AllowSecretsManagerUse",
      principals: [new iam.ServicePrincipal(`secretsmanager.${this.region}.amazonaws.com`)],
      actions: ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"],
      resources: ["*"],
      conditions: { StringEquals: { "kms:ViaService": `secretsmanager.${this.region}.amazonaws.com` } },
    }));
    const draftSecret = new secretsmanager.Secret(this, "DraftSecret", {
      description: "Employee+ confirmation token secret. Generated and consumed only by the ECS service.",
      encryptionKey: secretsKey,
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
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
    const repository = new ecr.Repository(this, "McpRepository", { imageScanOnPush: true, imageTagMutability: ecr.TagMutability.IMMUTABLE, encryption: ecr.RepositoryEncryption.KMS, encryptionKey: key, removalPolicy: cdk.RemovalPolicy.RETAIN });
    repository.addLifecycleRule({ tagStatus: ecr.TagStatus.UNTAGGED, maxImageAge: cdk.Duration.days(7) });
    const logGroup = new logs.LogGroup(this, "McpLogs", { logGroupName: "/aws/ecs/employee-plus", retention: logs.RetentionDays.ONE_MONTH, encryptionKey: key, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const logGroupArn = cdk.Stack.of(this).formatArn({ service: "logs", resource: "log-group:/aws/ecs/employee-plus", arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME });
    key.addToResourcePolicy(new iam.PolicyStatement({
      sid: "AllowCloudWatchLogsUse",
      principals: [new iam.ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      actions: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"],
      resources: ["*"],
      conditions: {
        ArnEquals: {
          "kms:EncryptionContext:aws:logs:arn": logGroupArn,
        },
      },
    }));
    const userPool = new cognito.UserPool(this, "Users", { selfSignUpEnabled: false, signInAliases: { email: true }, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const readScope = new cognito.ResourceServerScope({ scopeName: "read", scopeDescription: "Read home data" });
    const manageScope = new cognito.ResourceServerScope({ scopeName: "manage", scopeDescription: "Manage appointments" });
    const resourceServer = userPool.addResourceServer("EmployeePlusResourceServer", { identifier: "employee", scopes: [readScope, manageScope] });
    const client = userPool.addClient("AlexaPlusClient", { generateSecret: false, oAuth: { flows: { authorizationCodeGrant: true }, scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.resourceServer(resourceServer, readScope), cognito.OAuthScope.resourceServer(resourceServer, manageScope)] } });
    const cognitoDomain = userPool.addDomain("ManagedLoginDomain", { cognitoDomain: { domainPrefix: "employee-plus-796429457584" } });
    const runtimeRole = new iam.Role(this, "RuntimeRole", { assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com") });
    const executionRole = new iam.Role(this, "ExecutionRole", { assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com") });
    executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"));
    const infrastructureRole = new iam.Role(this, "InfrastructureRole", { assumedBy: new iam.ServicePrincipal("ecs.amazonaws.com") });
    infrastructureRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSInfrastructureRoleforExpressGatewayServices"));
    repository.grantPull(executionRole);
    draftSecret.grantRead(executionRole);
    table.grantReadWriteData(runtimeRole); documents.grantReadWrite(runtimeRole); events.grantSendMessages(runtimeRole); key.grantEncryptDecrypt(runtimeRole); key.grantEncryptDecrypt(executionRole);
    runtimeRole.addToPolicy(new iam.PolicyStatement({ actions: ["bedrock:InvokeModel"], resources: [`arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`] }));

    const streamRule = new eventsModule.Rule(this, "StateChangeRule", { eventPattern: { source: ["employee-plus.domain"], detailType: ["EmployeePlusStateChanged"] } });
    streamRule.addTarget(new eventTargets.SqsQueue(events));
    const enrichment = new lambda.Function(this, "AsyncEnrichment", { runtime: lambda.Runtime.NODEJS_22_X, handler: "index.handler", timeout: cdk.Duration.seconds(30), code: lambda.Code.fromInline("exports.handler = async (event) => { console.log(JSON.stringify({ records: event.Records?.length ?? 0 })); };"), environment: { BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0" } });
    events.grantConsumeMessages(enrichment);
    enrichment.addEventSource(new eventSources.SqsEventSource(events, { batchSize: 10, reportBatchItemFailures: true }));

    const service = deployService ? new ecs.CfnExpressGatewayService(this, "McpService", {
      serviceName: "employee-plus-mcp",
      cpu: "512",
      memory: "1024",
      executionRoleArn: executionRole.roleArn,
      infrastructureRoleArn: infrastructureRole.roleArn,
      taskRoleArn: runtimeRole.roleArn,
      healthCheckPath: "/health/ready",
      primaryContainer: {
        image: `${repository.repositoryUri}:${imageTag}`,
        containerPort: 3000,
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "RING_ENABLED", value: "false" },
          { name: "COGNITO_USER_POOL_ID", value: userPool.userPoolId },
          { name: "COGNITO_CLIENT_ID", value: client.userPoolClientId },
          { name: "COGNITO_DOMAIN", value: cognitoDomain.domainName },
          { name: "STATE_TABLE_NAME", value: table.tableName },
          { name: "DOCUMENTS_BUCKET_NAME", value: documents.bucketName },
          { name: "EVENTS_QUEUE_URL", value: events.queueUrl },
        ],
        secrets: [{ name: "DRAFT_SECRET", valueFrom: draftSecret.secretArn }],
        awsLogsConfiguration: { logGroup: logGroup.logGroupName, logStreamPrefix: "employee-plus" },
      },
    }) : undefined;

    new cdk.CfnOutput(this, "StateTableName", { value: table.tableName });
    new cdk.CfnOutput(this, "EventsQueueUrl", { value: events.queueUrl });
    new cdk.CfnOutput(this, "DocumentsBucketName", { value: documents.bucketName });
    new cdk.CfnOutput(this, "McpRepositoryUri", { value: repository.repositoryUri });
    new cdk.CfnOutput(this, "LogGroupName", { value: logGroup.logGroupName });
    new cdk.CfnOutput(this, "RuntimeRoleArn", { value: runtimeRole.roleArn });
    new cdk.CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "CognitoClientId", { value: client.userPoolClientId });
    new cdk.CfnOutput(this, "CognitoDomain", { value: cognitoDomain.domainName });
    new cdk.CfnOutput(this, "ServiceArn", { value: service?.attrServiceArn ?? "service-disabled-until-image-is-pushed" });
    new cdk.CfnOutput(this, "ServiceEndpoint", { value: service?.attrEndpoint ?? "service-disabled-until-image-is-pushed" });
  }
}
