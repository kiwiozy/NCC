#!/bin/bash

# WalkEasy Nexus Infrastructure Migration Script
# This script helps migrate from nexus-core-clinic-dev to walkeasy-nexus-dev

set -e  # Exit on error

echo "🚀 WalkEasy Nexus Infrastructure Migration"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK.${NC}"
    exit 1
fi

# Check if aws CLI is installed (for S3 migration)
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI not found. S3 migration steps will be skipped.${NC}"
fi

echo -e "${GREEN}✅ gcloud CLI found${NC}"
echo ""

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "none")
echo "Current GCP Project: ${CURRENT_PROJECT}"
echo ""

# Step 1: Create new GCP project
echo -e "${YELLOW}Step 1: Create New GCP Project${NC}"
echo "---------------------------"
echo ""

# Check if project already exists
if gcloud projects describe walkeasy-nexus-dev &>/dev/null; then
    echo -e "${YELLOW}⚠️  Project 'walkeasy-nexus-dev' already exists!${NC}"
    read -p "Do you want to use the existing project? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please delete the existing project or choose a different name."
        exit 1
    fi
else
    echo "Creating new GCP project: walkeasy-nexus-dev"
    read -p "Enter billing account ID (or press Enter to skip and link later): " BILLING_ACCOUNT
    
    if [ -z "$BILLING_ACCOUNT" ]; then
        gcloud projects create walkeasy-nexus-dev \
            --name="WalkEasy Nexus - Dev"
        echo -e "${YELLOW}⚠️  Project created but billing not linked. Link it manually later:${NC}"
        echo "   gcloud billing projects link walkeasy-nexus-dev --billing-account=YOUR_BILLING_ACCOUNT"
    else
        gcloud projects create walkeasy-nexus-dev \
            --name="WalkEasy Nexus - Dev"
        gcloud billing projects link walkeasy-nexus-dev \
            --billing-account="$BILLING_ACCOUNT"
        echo -e "${GREEN}✅ Project created and billing linked${NC}"
    fi
fi

# Set as default project
gcloud config set project walkeasy-nexus-dev
echo -e "${GREEN}✅ Set walkeasy-nexus-dev as default project${NC}"
echo ""

# Step 2: Enable APIs
echo -e "${YELLOW}Step 2: Enable Required APIs${NC}"
echo "---------------------------"
echo ""

APIS=(
    "cloudsql.googleapis.com"
    "run.googleapis.com"
    "secretmanager.googleapis.com"
    "storage-api.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "Enabling $api..."
    gcloud services enable "$api" --quiet
done

echo -e "${GREEN}✅ All APIs enabled${NC}"
echo ""

# Step 3: Create Service Accounts
echo -e "${YELLOW}Step 3: Create Service Accounts${NC}"
echo "---------------------------"
echo ""

SERVICE_ACCOUNTS=(
    "walkeasy-nexus-api-sa:WalkEasy Nexus API Service Account"
    "walkeasy-nexus-web-sa:WalkEasy Nexus Web Service Account"
    "walkeasy-nexus-worker-sa:WalkEasy Nexus Worker Service Account"
)

for sa_info in "${SERVICE_ACCOUNTS[@]}"; do
    IFS=':' read -r sa_id sa_display <<< "$sa_info"
    if gcloud iam service-accounts describe "$sa_id@walkeasy-nexus-dev.iam.gserviceaccount.com" &>/dev/null; then
        echo -e "${YELLOW}⚠️  Service account $sa_id already exists${NC}"
    else
        echo "Creating service account: $sa_id"
        gcloud iam service-accounts create "$sa_id" \
            --display-name="$sa_display" \
            --project=walkeasy-nexus-dev
        echo -e "${GREEN}✅ Created $sa_id${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Service accounts created${NC}"
echo ""

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ GCP Migration Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update your .env file with: GCP_PROJECT_ID=walkeasy-nexus-dev"
echo "2. Run S3 migration (see docs/setup/INFRASTRUCTURE_MIGRATION_GUIDE.md)"
echo "3. Update Cloud SQL connection strings if you have existing databases"
echo ""
echo "For S3 migration, run:"
echo "  aws s3 mb s3://walkeasy-nexus-documents --region ap-southeast-2"
echo ""

