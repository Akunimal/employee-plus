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
aws ecr get-login-password --profile $Profile --region $Region | docker login --username AWS --password-stdin $registry
docker build --tag "${repoUri}:${tag}" .
docker push "${repoUri}:${tag}"

$env:AWS_PROFILE = $Profile
$env:CDK_DEFAULT_ACCOUNT = $account
$env:CDK_DEFAULT_REGION = $Region
$env:DEPLOY_SERVICE = "true"
$env:IMAGE_TAG = $tag
pnpm --filter @employee-plus/infra exec cdk deploy EmployeePlusStack --profile $Profile --require-approval never

$serviceEndpoint = (aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue" --output text).Trim()
Write-Output "Employee+ ECS endpoint: $serviceEndpoint"
