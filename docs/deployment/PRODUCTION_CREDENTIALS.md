# 🔐 Production Credentials Inventory

**Created:** November 15, 2025  
**Status:** All credentials securely stored in Google Cloud Secret Manager  
**Action:** No actual credentials stored in this file for security

---

## ⚠️ **Security Notice**

**All production credentials are stored in Google Cloud Secret Manager, not in code or documentation.**

This file documents the **types** of credentials needed and their **status**, but does not contain actual values.

---

## ✅ **Credentials Stored in Secret Manager**

### **Production Secrets (10 total)**

| Secret Name | Purpose | Status |
|-------------|---------|--------|
| `django-secret-key` | Django production secret key | ✅ Stored |
| `aws-access-key-id` | AWS S3 access | ✅ Stored |
| `aws-secret-access-key` | AWS S3 secret | ✅ Stored |
| `xero-client-id` | Xero API integration | ✅ Stored |
| `xero-client-secret` | Xero API secret | ✅ Stored |
| `gmail-client-id` | Gmail OAuth integration | ✅ Stored |
| `gmail-client-secret` | Gmail OAuth secret | ✅ Stored |
| `smsb-username` | SMS Broadcast username | ✅ Stored |
| `smsb-password` | SMS Broadcast password | ✅ Stored |
| `openai-api-key` | OpenAI API access | ✅ Stored |

---

## 📋 **How to Access Credentials**

### **View All Secrets:**
```bash
gcloud secrets list --project=nexus-walkeasy-prod
```

### **Get a Specific Secret:**
```bash
gcloud secrets versions access latest --secret=SECRET_NAME --project=nexus-walkeasy-prod
```

### **Example:**
```bash
# Get Django secret key
gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod
```

---

## 🔒 **Security Best Practices**

1. **Never commit actual credentials to Git**
2. **All secrets stored in Secret Manager**
3. **Automatic injection at runtime** (Cloud Run)
4. **IAM-based access control**
5. **Audit logging enabled**
6. **Secret versioning supported**

---

## 📊 **Credential Types**

### **Django/Backend:**
- Django secret key (generated for production)
- Database password (generated for Cloud SQL)

### **AWS Integration:**
- S3 access key ID
- S3 secret access key
- Region: ap-southeast-2
- Bucket: walkeasy-nexus-documents

### **Xero Integration:**
- Client ID
- Client secret
- Redirect URI: (updated for production)

### **Gmail Integration:**
- Client ID (OAuth)
- Client secret (OAuth)
- Redirect URI: (updated for production)

### **SMS Broadcast:**
- API username
- API password
- Webhook secret

### **OpenAI:**
- API key (for GPT-4o-mini features)

---

## 🔄 **Next Steps**

### **After Deployment, Update:**

1. **Xero Redirect URI**
   - Go to: https://developer.xero.com/myapps
   - Add production callback URL

2. **Gmail Redirect URI**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Add production callback URL

3. **SMS Webhook URL**
   - Update in SMS Broadcast portal
   - Point to production backend

---

## ✅ **Verification**

All credentials successfully migrated to Secret Manager on November 15, 2025.

**To verify:**
```bash
gcloud secrets list --project=nexus-walkeasy-prod
```

Expected output: 10 secrets listed

---

**Last Updated:** November 15, 2025  
**Status:** All credentials secure in Secret Manager

