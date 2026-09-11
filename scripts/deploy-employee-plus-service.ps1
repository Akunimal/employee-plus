[CmdletBinding()]
param(
  [string]$Profile = "employee-plus",
  [string]$Region = "us-east-2",
  [string]$ImageTag = ""
)

$ErrorActionPreference = "Stop"

if (-not $ImageTag) {
  $ImageTag = (git rev-parse HEAD).Trim()
}

$outputs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$repoUri = ($outputs | Where-Object OutputKey -eq "McpRepositoryUri").OutputValue
if (-not $repoUri) {
  throw "EmployeePlusStack does not expose McpRepositoryUri. Deploy the data plane first."
}

$imageUri = "${repoUri}:${ImageTag}"
$imageExists = aws ecr describe-images --profile $Profile --region $Region --repository-name ($repoUri.Split("/")[1]) --image-ids imageTag=$ImageTag --query "imageDetails[0].imageDigest" --output text
if ($LASTEXITCODE -ne 0 -or -not $imageExists -or $imageExists.Trim() -eq "None") {
  throw "Image tag $ImageTag is not available in ECR. Run the Publish container workflow first."
}

$account = (aws sts get-caller-identity --profile $Profile --query Account --output text).Trim()
$env:AWS_PROFILE = $Profile
$env:CDK_DEFAULT_ACCOUNT = $account
$env:CDK_DEFAULT_REGION = $Region
$env:DEPLOY_SERVICE = "true"
$env:IMAGE_TAG = $ImageTag
pnpm --filter @employee-plus/infra exec cdk deploy EmployeePlusStack --profile $Profile --require-approval never

$serviceEndpoint = (aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue" --output text).Trim()
Write-Output "Employee+ ECS endpoint: $serviceEndpoint"
