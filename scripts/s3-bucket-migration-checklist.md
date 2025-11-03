# S3 Bucket Migration Checklist - WalkEasy Nexus

## ✅ Step 1: Create New Bucket (AWS Console)

1. Go to: https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. **Bucket name:** `walkeasy-nexus-documents`
4. **Region:** `Asia Pacific (Sydney) ap-southeast-2`
5. **Block Public Access:** Keep all boxes checked ✅
6. **Bucket Versioning:** Enable ✅
7. **Encryption:** Enable (default SSE-S3) ✅
8. Click "Create bucket"

---

## ✅ Step 2: Update IAM User Policy (AWS Console)

1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → Find `walkeasy-email-api`
3. Click "Add permissions" → "Create inline policy"
4. Click "JSON" tab
5. Paste this policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "WalkEasyNexusS3Access",
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
6. Click "Next" → Name it: `WalkEasyNexusS3Access`
7. Click "Create policy"

**Note:** You can keep the old bucket policy too if you want, or remove it after confirming the new bucket works.

---

## ✅ Step 3: Delete Old Bucket (AWS Console)

**⚠️ WARNING: This will permanently delete all data in the old bucket!**

Since this was just test data, it's safe to delete:

1. Go to: https://console.aws.amazon.com/s3/
2. Find bucket: `nexus-core-clinic-documents`
3. Click on the bucket name
4. Click "Empty bucket" (if it has files)
5. Confirm deletion of all objects
6. Go back to bucket list
7. Select `nexus-core-clinic-documents`
8. Click "Delete"
9. Type the bucket name to confirm: `nexus-core-clinic-documents`
10. Click "Delete bucket"

---

## ✅ Step 4: Update .env File

After completing steps 1-3, the `.env` file will be updated automatically, or you can update it manually:

```bash
AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
```

---

## ✅ Step 5: Verify New Bucket Access

After completing all steps, verify the new bucket works:

```bash
aws s3 ls s3://walkeasy-nexus-documents
```

If this works, you're all set! 🎉

