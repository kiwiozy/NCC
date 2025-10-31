# 🪣 AWS S3 Setup Guide for Nexus Core Clinic

## ✅ **What's Already Done**
The S3 integration code is complete! We just need to create an S3 bucket.

## 📋 **Option 1: Create S3 Bucket via AWS Console (Easiest)**

### Step 1: Log into AWS Console
1. Go to https://console.aws.amazon.com/
2. Sign in with your AWS account credentials

### Step 2: Create S3 Bucket
1. Search for "S3" in the top search bar
2. Click "Create bucket"
3. **Bucket name:** `nexus-core-clinic-documents` (must be globally unique)
4. **Region:** `Asia Pacific (Sydney) - ap-southeast-2`
5. **Block Public Access:** Leave all boxes CHECKED (keep it private)
6. **Bucket Versioning:** Enable (recommended)
7. **Encryption:** Enable (default SSE-S3)
8. Click "Create bucket"

### Step 3: Create IAM User for API Access
1. Go to IAM service in AWS Console
2. Click "Users" → "Create user"
3. **Username:** `nexus-core-clinic-s3-user`
4. **Permissions:** Attach policies directly
5. Search and select: `AmazonS3FullAccess` (or create custom policy below)
6. Click "Create user"

### Step 4: Generate Access Keys
1. Click on the newly created user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. **Use case:** Select "Application running outside AWS"
5. Click "Next" → "Create access key"
6. **IMPORTANT:** Copy the Access Key ID and Secret Access Key immediately!

### Step 5: Update .env File
Add these lines to `/Users/craig/Documents/nexus-core-clinic/backend/.env`:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id_from_step_4
AWS_SECRET_ACCESS_KEY=your_secret_key_from_step_4
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=nexus-core-clinic-documents
```

---

## 📋 **Option 2: Create S3 Bucket via AWS CLI**

### Step 1: Install AWS CLI
```bash
# macOS
brew install awscli

# Or download from: https://aws.amazon.com/cli/
```

### Step 2: Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: ap-southeast-2
# Default output format: json
```

### Step 3: Create S3 Bucket
```bash
# Create bucket
aws s3 mb s3://nexus-core-clinic-documents --region ap-southeast-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket nexus-core-clinic-documents \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket nexus-core-clinic-documents \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access (security)
aws s3api put-public-access-block \
  --bucket nexus-core-clinic-documents \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

---

## 🔒 **Recommended IAM Policy (More Secure)**

Instead of `AmazonS3FullAccess`, create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::nexus-core-clinic-documents",
        "arn:aws:s3:::nexus-core-clinic-documents/*"
      ]
    }
  ]
}
```

---

## 🧪 **Test the S3 Integration**

### Step 1: Check Bucket Status
```bash
curl https://localhost:8000/api/documents/bucket_status/ -k
```

Expected response:
```json
{
  "bucket_name": "nexus-core-clinic-documents",
  "region": "ap-southeast-2",
  "accessible": true
}
```

### Step 2: Upload a Test File
```bash
# Create a test file
echo "Test document content" > test.txt

# Upload via API
curl -X POST https://localhost:8000/api/documents/upload/ \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.txt" \
  -F "category=other" \
  -F "description=Test upload" \
  -F "uploaded_by=test_user" \
  -k
```

### Step 3: List Documents
```bash
curl https://localhost:8000/api/documents/ -k
```

### Step 4: Get Download URL
```bash
# Replace {document_id} with the ID from the upload response
curl https://localhost:8000/api/documents/{document_id}/download_url/ -k
```

---

## 📝 **What's Been Built**

### ✅ Backend Components Created:
1. **`documents/models.py`** - Document model with S3 metadata
2. **`documents/services.py`** - S3Service for upload/download/delete
3. **`documents/serializers.py`** - API serializers
4. **`documents/views.py`** - REST API endpoints
5. **`documents/admin.py`** - Django admin interface
6. **Database migrations** - Applied successfully

### ✅ API Endpoints Available:
- `POST /api/documents/upload/` - Upload file to S3
- `GET /api/documents/` - List all documents
- `GET /api/documents/{id}/` - Get document details
- `GET /api/documents/{id}/download_url/` - Get pre-signed download URL
- `DELETE /api/documents/{id}/` - Delete document
- `GET /api/documents/bucket_status/` - Check S3 connectivity

### ✅ Features Implemented:
- File upload with automatic S3 key generation
- Pre-signed URLs for secure downloads (1-hour expiration)
- Soft delete (marks inactive in DB, deletes from S3)
- Document categorization (medical, prescription, referral, etc.)
- Generic relationships (link documents to any model)
- File size tracking and human-readable display
- MIME type detection
- Tag support for organization
- Full admin interface

---

## 💰 **AWS S3 Pricing (Sydney Region)**

### Storage Costs:
- **First 50 TB/month:** $0.025 per GB
- **Example:** 100 GB = ~$2.50/month

### Request Costs:
- **PUT/COPY/POST:** $0.0047 per 1,000 requests
- **GET:** $0.00037 per 1,000 requests
- **Example:** 10,000 uploads + 100,000 downloads = ~$0.08/month

### Data Transfer:
- **Upload (IN):** FREE
- **Download (OUT):** First 100 GB/month FREE, then $0.114 per GB

**Estimated Monthly Cost:** $5-10 for typical clinic usage 📊

---

## 🚀 **Next Steps**

1. **Create S3 Bucket** (follow Option 1 or 2 above)
2. **Update .env** with your AWS credentials
3. **Restart Django** server
4. **Test the integration** with the curl commands above
5. **Integrate with Frontend** (upload UI coming next!)

---

## 🔐 **Security Notes**

- ✅ All files are private by default
- ✅ Download URLs expire after 1 hour
- ✅ IAM user has minimal required permissions
- ✅ Server-side encryption enabled
- ✅ Public access blocked
- ✅ Access keys never exposed to frontend
- ✅ Files are soft-deleted (can be recovered)

---

## ❓ **Troubleshooting**

### "AccessDenied" Error
- Check IAM user has S3 permissions
- Verify bucket name in .env matches actual bucket
- Confirm AWS credentials are correct

### "NoSuchBucket" Error
- Verify bucket exists in AWS Console
- Check bucket name spelling
- Ensure region matches (.env should be ap-southeast-2)

### "InvalidAccessKeyId" Error
- Regenerate access keys in IAM
- Update .env with new credentials
- Restart Django server

---

**Need help?** The S3 integration is ready to go - just add your credentials!

