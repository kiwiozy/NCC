# 🚀 Infrastructure Migration Guide - WalkEasy Nexus

**Complete guide for migrating infrastructure resources from old names to new names**

---

## 📋 Overview

This guide covers migrating infrastructure resources from:
- **GCP Project:** `nexus-core-clinic-dev` → `walkeasy-nexus-dev`
- **S3 Bucket:** `nexus-core-clinic-documents` → `walkeasy-nexus-documents`
- **IAM User:** `nexus-core-clinic-s3-user` → `walkeasy-nexus-s3-user`

---

## ⚠️ Important Notes

### **When to Migrate**

- ✅ **Development environment:** Migrate now to start fresh
- ⚠️ **Production environment:** Plan migration window, notify users, backup data

### **Migration Strategy**

1. **Option A: Create New Resources (Recommended for Development)**
   - Create new GCP project / S3 bucket with new names
   - Migrate data from old resources
   - Update environment variables
   - Test thoroughly
   - Decommission old resources

2. **Option B: Keep Old Resources (Temporary)**
   - Update documentation to reference new names
   - Migrate when convenient (e.g., during maintenance window)

---

## 🏗️ GCP Project Migration

### **Step 1: Create New GCP Project**

```bash
# Create new project
gcloud projects create walkeasy-nexus-dev \
  --name="WalkEasy Nexus - Dev" \
  --folder=YOUR_FOLDER_ID

# Set as default
gcloud config set project walkeasy-nexus-dev

# Enable billing
gcloud billing projects link walkeasy-nexus-dev \
  --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### **Step 2: Enable Required APIs**

```bash
# Enable APIs
gcloud services enable \
  cloudsql.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage-api.googleapis.com
```

### **Step 3: Create Service Accounts**

```bash
# API Service Account
gcloud iam service-accounts create walkeasy-nexus-api-sa \
  --display-name="WalkEasy Nexus API Service Account"

# Web Service Account
gcloud iam service-accounts create walkeasy-nexus-web-sa \
  --display-name="WalkEasy Nexus Web Service Account"

# Worker Service Account
gcloud iam service-accounts create walkeasy-nexus-worker-sa \
  --display-name="WalkEasy Nexus Worker Service Account"
```

### **Step 4: Migrate Cloud SQL (if exists)**

```bash
# Export from old project
gcloud config set project nexus-core-clinic-dev
gcloud sql export sql INSTANCE_NAME gs://BUCKET_NAME/export.sql

# Import to new project
gcloud config set project walkeasy-nexus-dev
gcloud sql import sql INSTANCE_NAME gs://BUCKET_NAME/export.sql
```

### **Step 5: Update Environment Variables**

Update `.env` files and Cloud Run configurations:

```bash
# Old
GCP_PROJECT_ID=nexus-core-clinic-dev

# New
GCP_PROJECT_ID=walkeasy-nexus-dev
```

### **Step 6: Update Cloud Run Services**

```bash
# Update Cloud Run service to use new project
gcloud run deploy SERVICE_NAME \
  --project=walkeasy-nexus-dev \
  --region=australia-southeast1
```

---

## 🪣 AWS S3 Bucket Migration

### **Step 1: Create New S3 Bucket**

```bash
# Create new bucket
aws s3 mb s3://walkeasy-nexus-documents \
  --region ap-southeast-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket walkeasy-nexus-documents \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket walkeasy-nexus-documents \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### **Step 2: Sync Data from Old Bucket**

```bash
# Sync all files from old bucket to new bucket
aws s3 sync s3://nexus-core-clinic-documents \
  s3://walkeasy-nexus-documents \
  --region ap-southeast-2

# Verify sync
aws s3 ls s3://walkeasy-nexus-documents --recursive --human-readable
```

### **Step 3: Create New IAM User**

```bash
# Create IAM user
aws iam create-user --user-name walkeasy-nexus-s3-user

# Create access policy
aws iam put-user-policy \
  --user-name walkeasy-nexus-s3-user \
  --policy-name WalkEasyNexusS3Access \
  --policy-document file://s3-policy.json
```

**S3 Policy (`s3-policy.json`):**
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
        "arn:aws:s3:::walkeasy-nexus-documents",
        "arn:aws:s3:::walkeasy-nexus-documents/*"
      ]
    }
  ]
}
```

### **Step 4: Generate New Access Keys**

```bash
# Create access key for new user
aws iam create-access-key --user-name walkeasy-nexus-s3-user
```

**Save the Access Key ID and Secret Access Key immediately!**

### **Step 5: Update Environment Variables**

Update `.env` files:

```bash
# Old
AWS_S3_BUCKET_NAME=nexus-core-clinic-documents
AWS_ACCESS_KEY_ID=OLD_KEY
AWS_SECRET_ACCESS_KEY=OLD_SECRET

# New
AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
AWS_ACCESS_KEY_ID=NEW_KEY
AWS_SECRET_ACCESS_KEY=NEW_SECRET
```

### **Step 6: Update Application Code**

All references in code should already be updated. Verify:

```bash
# Check for any remaining old references
grep -r "nexus-core-clinic-documents" backend/
grep -r "nexus-core-clinic-s3-user" backend/
```

### **Step 7: Test New Configuration**

```bash
# Test S3 connection
curl https://localhost:8000/api/documents/bucket_status/ -k

# Expected:
{
  "bucket_name": "walkeasy-nexus-documents",
  "region": "ap-southeast-2",
  "accessible": true
}
```

### **Step 8: Decommission Old Resources**

⚠️ **Only after verifying new setup works:**

```bash
# Delete old IAM user (after revoking old keys)
aws iam delete-user --user-name nexus-core-clinic-s3-user

# Empty and delete old bucket (irreversible!)
aws s3 rm s3://nexus-core-clinic-documents --recursive
aws s3 rb s3://nexus-core-clinic-documents
```

---

## ✅ Migration Checklist

### **Pre-Migration**
- [ ] Backup all data from old resources
- [ ] Document current configuration
- [ ] Plan migration window (if production)
- [ ] Notify team/users (if production)

### **GCP Migration**
- [ ] Create new GCP project: `walkeasy-nexus-dev`
- [ ] Enable required APIs
- [ ] Create service accounts
- [ ] Migrate Cloud SQL data (if exists)
- [ ] Update Cloud Run services
- [ ] Update environment variables
- [ ] Test all GCP services
- [ ] Update documentation

### **S3 Migration**
- [ ] Create new S3 bucket: `walkeasy-nexus-documents`
- [ ] Sync data from old bucket
- [ ] Create new IAM user: `walkeasy-nexus-s3-user`
- [ ] Generate new access keys
- [ ] Update environment variables
- [ ] Test S3 operations (upload/download)
- [ ] Update application code references
- [ ] Verify all functionality

### **Post-Migration**
- [ ] Monitor application logs for errors
- [ ] Verify all integrations work
- [ ] Update all documentation
- [ ] Decommission old resources (after verification period)
- [ ] Update team on new configuration

---

## 🔄 Rollback Plan

If migration fails:

1. **Revert Environment Variables**
   ```bash
   # Restore old values
   AWS_S3_BUCKET_NAME=nexus-core-clinic-documents
   GCP_PROJECT_ID=nexus-core-clinic-dev
   ```

2. **Keep Old Resources**
   - Don't delete old resources immediately
   - Keep for 30 days as backup

3. **Document Issues**
   - Record what went wrong
   - Fix issues before retrying

---

## 📞 Support

If you encounter issues during migration:
- Check CloudWatch logs (AWS)
- Check Cloud Logging (GCP)
- Review application error logs
- Consult this guide's troubleshooting sections

---

**Last Updated:** November 2025  
**Status:** Ready for migration  
**Priority:** High (for consistency)

