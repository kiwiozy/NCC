#!/bin/bash

# Script to update S3 bucket configuration for WalkEasy Nexus

echo "🪣 WalkEasy Nexus S3 Bucket Update"
echo "===================================="
echo ""

# Check if bucket exists
echo "Checking if bucket exists..."
if aws s3 ls s3://walkeasy-nexus-documents 2>/dev/null; then
    echo "✅ Bucket 'walkeasy-nexus-documents' exists"
else
    echo "❌ Bucket 'walkeasy-nexus-documents' not found"
    echo ""
    echo "Please create the bucket via AWS Console:"
    echo "1. Go to: https://console.aws.amazon.com/s3/"
    echo "2. Create bucket: walkeasy-nexus-documents"
    echo "3. Region: ap-southeast-2"
    echo "4. Enable versioning and encryption"
    echo ""
    exit 1
fi

echo ""
echo "✅ Bucket ready!"
echo ""
echo "Next steps:"
echo "1. Update IAM user policy to access new bucket"
echo "2. Update .env file with new bucket name"
echo ""

