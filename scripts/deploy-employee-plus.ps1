[CmdletBinding()]
param(
  [string]$Profile = "employee-plus",
  [string]$Region = "us-east-2",
  [string]$DockerDistribution = "Ubuntu"
)

$ErrorActionPreference = "Stop"

function Invoke-Docker {
  param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
  if ($script:UseWslDocker) {
    & wsl -d $DockerDistribution -- docker --config $script:WslDockerConfig @Arguments
  } else {
    & docker @Arguments
  }
}

$script:UseWslDocker = $false
& docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) {
  & wsl -d $DockerDistribution -- docker info --format "{{.ServerVersion}}" *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Neither Docker Desktop nor the Docker Engine in WSL is available. Start the Docker Engine or pass a working -DockerDistribution."
  }
  $script:UseWslDocker = $true
  Write-Output "Using Docker Engine in WSL distribution: $DockerDistribution"
} else {
  Write-Output "Using Docker Desktop Docker Engine"
}

$script:WslDockerConfig = $null
if ($script:UseWslDocker) {
  $script:WslDockerConfig = (& wsl -d $DockerDistribution -- bash -lc 'mktemp -d /tmp/employee-plus-docker.XXXXXX').Trim()
  if ($LASTEXITCODE -ne 0 -or -not $script:WslDockerConfig) {
    throw "Could not create a temporary Docker config directory in WSL."
  }
}

$account = (aws sts get-caller-identity --profile $Profile --query Account --output text).Trim()
$outputs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name EmployeePlusStack --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$repoUri = ($outputs | Where-Object OutputKey -eq "McpRepositoryUri").OutputValue
if (-not $repoUri) {
  throw "EmployeePlusStack does not expose McpRepositoryUri. Deploy the data plane first."
}

$tag = (git rev-parse HEAD).Trim()
$registry = $repoUri.Split("/")[0]
$image = "${repoUri}:${tag}"
try {
  $loginPassword = aws ecr get-login-password --profile $Profile --region $Region
  if ($LASTEXITCODE -ne 0) { throw "ECR authentication failed." }
  if ($script:UseWslDocker) {
    $loginPassword | & wsl -d $DockerDistribution -- docker --config $script:WslDockerConfig login --username AWS --password-stdin $registry
  } else {
    $loginPassword | & docker login --username AWS --password-stdin $registry
  }
  if ($LASTEXITCODE -ne 0) { throw "ECR authentication failed." }

  if ($script:UseWslDocker) {
    $workspace = (Get-Location).Path
    if ($workspace.Length -lt 3 -or $workspace[1] -ne ':') { throw "The workspace path must be on a Windows drive for WSL Docker." }
    $linuxWorkspace = "/mnt/$($workspace.Substring(0, 1).ToLower())/$($workspace.Substring(3).Replace('\', '/'))"
    & wsl -d $DockerDistribution -- bash -lc "cd '$linuxWorkspace' && docker --config '$script:WslDockerConfig' build --tag '$image' ."
  } else {
    & docker build --tag $image .
  }
  if ($LASTEXITCODE -ne 0) { throw "Docker image build failed." }
  Invoke-Docker push $image
  if ($LASTEXITCODE -ne 0) { throw "ECR image push failed." }
} finally {
  if ($script:UseWslDocker -and $script:WslDockerConfig) {
    & wsl -d $DockerDistribution -- rm -rf $script:WslDockerConfig *> $null
    $script:WslDockerConfig = $null
  }
}

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
