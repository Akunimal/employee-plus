[CmdletBinding()]
param(
  [string]$Profile = "employee-plus",
  [string]$Region = "us-east-2"
)

$ErrorActionPreference = "Stop"

docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop must be running before building the Employee+ image."
}

$account = (aws sts get-caller-identity --profile $Profile --query Account --output text).Trim()
$outputs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$repoUri = ($outputs | Where-Object OutputKey -eq "McpRepositoryUri").OutputValue
if (-not $repoUri) {
  throw "EmployeePlusStack does not expose McpRepositoryUri. Deploy the data plane first."
}

$tag = (git rev-parse HEAD).Trim()
$registry = $repoUri.Split("/")[0]
$ecrPassword = aws ecr get-login-password --profile $Profile --region $Region
if ($LASTEXITCODE -ne 0 -or -not $ecrPassword) { throw "Unable to obtain ECR login credentials." }
$ecrPassword | docker login --username AWS --password-stdin $registry
if ($LASTEXITCODE -ne 0) { throw "ECR authentication failed." }
docker build --tag "${repoUri}:${tag}" .
if ($LASTEXITCODE -ne 0) { throw "Docker image build failed." }
docker push "${repoUri}:${tag}"
if ($LASTEXITCODE -ne 0) { throw "ECR image push failed." }

$env:AWS_PROFILE = $Profile
$env:CDK_DEFAULT_ACCOUNT = $account
$env:CDK_DEFAULT_REGION = $Region
$env:DEPLOY_SERVICE = "true"
$env:IMAGE_TAG = $tag
pnpm --filter @employee-plus/infra exec cdk deploy EmployeePlusStack --profile $Profile --require-approval never
if ($LASTEXITCODE -ne 0) { throw "AWS CDK deployment failed." }

$serviceEndpoint = (aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue" --output text).Trim()
if (-not $serviceEndpoint -or $serviceEndpoint -eq "service-disabled-until-image-is-pushed") {
  throw "ECS service endpoint was not created."
}
Write-Output "Employee+ ECS endpoint: $serviceEndpoint"
