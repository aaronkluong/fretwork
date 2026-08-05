#!/usr/bin/env bash
# deploy_aws.sh
# Automated build, tag, push, and deployment script for Fretwork AWS Backend.
# Usage: ./scripts/deploy_aws.sh [AWS_ACCOUNT_ID] [AWS_REGION]

set -euo pipefail

AWS_ACCOUNT_ID="${1:-${AWS_ACCOUNT_ID:-992685484195}}"
AWS_REGION="${2:-${AWS_REGION:-us-east-1}}"
REPO_NAME="fretwork-backend"
IMAGE_TAG="latest"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

echo "=========================================================="
echo " Fretwork ML Backend AWS ECS Deployment Automation"
echo " Account ID: ${AWS_ACCOUNT_ID}"
echo " Region:     ${AWS_REGION}"
echo " ECR Target: ${ECR_URI}"
echo "=========================================================="

# 1. Authenticate Docker with AWS ECR
echo "--> [1/5] Authenticating Docker with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 2. Ensure Repository Exists
echo "--> [2/5] Checking ECR repository..."
aws ecr describe-repositories --repository-names "${REPO_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
aws ecr create-repository --repository-name "${REPO_NAME}" --region "${AWS_REGION}"

# 3. Build Docker Image
echo "--> [3/5] Building Docker Image for linux/amd64 architecture..."
docker build --platform linux/amd64 -t "${REPO_NAME}:${IMAGE_TAG}" -f backend/Dockerfile backend/

# 4. Tag and Push to ECR
echo "--> [4/5] Tagging and Pushing Image to ECR..."
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URI}"
docker push "${ECR_URI}"

# 5. Register Task Definition & Update ECS Service
echo "--> [5/5] Updating ECS Task Definition & Service..."
aws ecs register-task-definition --cli-input-json file://backend/ecs-task-def.json --region "${AWS_REGION}"

aws ecs update-service \
  --cluster fretwork-cluster \
  --service fretwork-backend-service \
  --force-new-deployment \
  --region "${AWS_REGION}" >/dev/null 2>&1 || echo "Notice: ECS cluster/service update skipped (manual service launch required if cluster is not yet created)."

echo "=========================================================="
echo " AWS Deployment Artifact Preparation Complete!"
echo " Container image pushed to: ${ECR_URI}"
echo "=========================================================="
