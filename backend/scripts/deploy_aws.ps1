# deploy_aws.ps1
# Automated build, tag, push, and deployment script for Fretwork AWS Backend on Windows PowerShell.
# Usage: .\backend\scripts\deploy_aws.ps1 -AccountId "992685484195" -Region "us-east-1"

param(
    [string]$AccountId = "992685484195",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$RepoName = "fretwork-backend"
$ImageTag = "latest"
$EcrUri = "${AccountId}.dkr.ecr.${Region}.amazonaws.com/${RepoName}:${ImageTag}"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Fretwork ML Backend AWS ECS Deployment Automation (PS)" -ForegroundColor Cyan
Write-Host " Account ID: $AccountId"
Write-Host " Region:     $Region"
Write-Host " ECR Target: $EcrUri"
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Authenticate Docker with AWS ECR
Write-Host "--> [1/5] Authenticating Docker with ECR..." -ForegroundColor Yellow
(Get-ECRLoginCommand -Region $Region).Password | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${Region}.amazonaws.com"
if ($LASTEXITCODE -ne 0) {
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${Region}.amazonaws.com"
}

# 2. Ensure ECR Repository Exists
Write-Host "--> [2/5] Checking ECR repository..." -ForegroundColor Yellow
$repoExists = aws ecr describe-repositories --repository-names $RepoName --region $Region 2>$null
if (-not $repoExists) {
    aws ecr create-repository --repository-name $RepoName --region $Region
}

# 3. Build Docker Image
Write-Host "--> [3/5] Building Docker Image for linux/amd64 architecture..." -ForegroundColor Yellow
docker build --platform linux/amd64 -t "${RepoName}:${ImageTag}" -f backend/Dockerfile backend/

# 4. Tag and Push to ECR
Write-Host "--> [4/5] Tagging and Pushing Image to ECR..." -ForegroundColor Yellow
docker tag "${RepoName}:${ImageTag}" $EcrUri
docker push $EcrUri

# 5. Register Task Definition
Write-Host "--> [5/5] Registering ECS Task Definition..." -ForegroundColor Yellow
aws ecs register-task-definition --cli-input-json file://backend/ecs-task-def.json --region $Region

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " AWS Deployment Artifact Preparation Complete!" -ForegroundColor Green
Write-Host " Container image pushed to: $EcrUri" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
