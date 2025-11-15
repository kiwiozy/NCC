# Deployment Plan - Final Decision Summary

**Date:** November 9, 2025  
**Decision:** Hybrid AWS + GCP Architecture  
**Status:** ✅ FINALIZED

---

## 🎯 **Final Decision: Hybrid AWS + Google Cloud**

After comprehensive analysis and independent ChatGPT review, you've chosen:

**Option B: Hybrid Architecture**
- AWS S3 (storage)
- Google Cloud Run (compute)
- Google Cloud SQL (database)

---

## 💰 **Cost Summary:**

| Period | Cost | Details |
|--------|------|---------|
| **Current (FileMaker)** | $230/month | Legacy system |
| **Transition (2-3 months)** | $396/month | FileMaker + Hybrid |
| **After Migration** | **$166/month** | Hybrid only |
| **Annual Savings** | **$768/year** | vs FileMaker ✅ |

**Additional Savings:**
- vs Pure AWS: Save $40/month ($480/year)
- vs Pure GCP: Save $0-24/month (but no S3 migration!)

---

## ✅ **Why Hybrid?**

1. **No S3 Migration** - 11,269 documents stay in AWS (zero downtime)
2. **Simpler Compute** - Cloud Run is easier than ECS Fargate
3. **Best Cost** - $166/month (cheapest option without migration)
4. **Google Integration** - Unified with OAuth, Gmail APIs
5. **Proven Recommendation** - Both our analysis AND ChatGPT agreed this is optimal
6. **Fast Timeline** - 3-4 weeks to production

---

## 🏗️ **Architecture Overview:**

```
Frontend (Next.js)     → AWS CloudFront + S3
Backend (Django)       → Google Cloud Run (serverless)
Database (PostgreSQL)  → Google Cloud SQL
Cache (Redis)          → Google Memorystore
Storage (Documents)    → AWS S3 (existing bucket) ✅
DNS                    → AWS Route 53
Monitoring             → Google Cloud Logging
```

**Cross-Cloud:** Django on Cloud Run → AWS S3 via boto3 SDK (same as now)

---

## 🗓️ **Revised Timeline:**

### **Week 1 (Nov 11-17): GCP Infrastructure**
- [ ] Create Google Cloud project
- [ ] Set up Cloud SQL (PostgreSQL)
- [ ] Set up Memorystore (Redis)
- [ ] Configure IAM for S3 access
- [ ] Set up Cloud Logging

### **Week 2 (Nov 18-24): Application Deployment**
- [ ] Build Django Docker image
- [ ] Deploy to Cloud Run
- [ ] Configure environment variables (AWS + GCP)
- [ ] Run database migrations
- [ ] Deploy Next.js to CloudFront + S3

### **Week 3 (Nov 25-Dec 1): Testing & Migration**
- [ ] Test all integrations (Google OAuth, Gmail, Xero, SMS, S3, OpenAI)
- [ ] Import production data to Cloud SQL
- [ ] End-to-end testing
- [ ] User acceptance testing

### **Week 4 (Dec 2-8): Go-Live**
- [ ] Saturday night cutover (Dec 7, 8pm-12am AEST)
- [ ] Update DNS to Cloud Run
- [ ] Monitor for 24-48 hours
- [ ] FileMaker becomes read-only backup

---

## 🔑 **Configuration Requirements:**

### **Google Cloud:**
- [ ] Create GCP project
- [ ] Enable billing
- [ ] Enable APIs (Cloud Run, Cloud SQL, Memorystore, Secret Manager)
- [ ] Add Google OAuth redirect URIs:
  - `https://nexus.walkeasy.com.au/accounts/google/login/callback/`
  - `https://nexus.walkeasy.com.au/gmail/oauth/callback/`

### **AWS (Keep Existing):**
- [x] S3 bucket: `walkeasy-nexus-documents` (already configured) ✅
- [x] IAM user for S3 access (already configured) ✅
- [ ] Create IAM role for Cloud Run to access S3
- [ ] Route 53 DNS record: `nexus.walkeasy.com.au` → Cloud Run

### **Environment Variables:**

**Google Cloud (GCP):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@cloud-sql-proxy/nexus

# Redis
REDIS_URL=redis://memorystore-ip:6379

# Google Services (existing)
GMAIL_CLIENT_ID=<existing>
GMAIL_CLIENT_SECRET=<existing>
```

**AWS (Keep Existing):**
```bash
# S3 Storage (no changes needed)
AWS_ACCESS_KEY_ID=<existing>
AWS_SECRET_ACCESS_KEY=<existing>
AWS_S3_BUCKET_NAME=walkeasy-nexus-documents
AWS_REGION=ap-southeast-2
```

---

## 📊 **Services Breakdown:**

### **Google Cloud Platform:**
| Service | Purpose | Cost |
|---------|---------|------|
| Cloud Run | Django API (serverless) | $15-25/month |
| Cloud SQL | PostgreSQL database | $60-80/month |
| Memorystore | Redis cache | $20/month |
| Cloud Logging | Monitoring, alerts | $10/month |
| Secret Manager | API keys, credentials | $2/month |
| Backups | Daily + archives | $20-25/month |
| **GCP Total** | | **~$127-162/month** |

### **AWS:**
| Service | Purpose | Cost |
|---------|---------|------|
| S3 | Document storage (existing) | $3/month |
| CloudFront | Frontend CDN | $10/month |
| Route 53 | DNS | $1/month |
| Data Transfer | Cross-cloud (GCP ↔ S3) | $5-10/month |
| **AWS Total** | | **~$19-24/month** |

**Combined Total:** ~$146-186/month (avg: **$166/month**)

---

## 🔐 **Security & Compliance:**

### **Maintained:**
- ✅ All data encrypted (at rest & in transit)
- ✅ Australian Privacy Principles (APP) compliant
- ✅ HIPAA-ready architecture
- ✅ Multi-tier backup strategy
- ✅ Audit logging (Cloud Logging)
- ✅ Google OAuth authentication
- ✅ VPC private networking (Cloud SQL)

### **Monitoring:**
- **Alerts to:** craig@walkeasy.com.au + 0412 345 678
- **Email:** All alerts
- **SMS:** Critical only (database down, high error rate)

---

## 📈 **Long-Term Benefits:**

1. **Cost Predictable:** ~$166/month (fixed, no surprises)
2. **Easy to Scale:** Cloud Run auto-scales (0 to 1000s of requests)
3. **Simple Management:** Serverless = less ops work
4. **Unified Google:** OAuth, Gmail, hosting in one ecosystem
5. **Keep S3 Investment:** No wasted effort, existing bucket stays
6. **Future Flexible:** Can migrate S3 to GCS later if desired

---

## ⚠️ **Trade-Offs Accepted:**

1. **Two Cloud Bills:** AWS ($19-24/month) + GCP ($127-162/month)
   - **Mitigation:** Both manageable, total still cheap
2. **Two Admin Consoles:** AWS Console + Google Cloud Console
   - **Mitigation:** Only check AWS for S3 monitoring
3. **Cross-Cloud IAM:** Cloud Run needs IAM role for S3
   - **Mitigation:** One-time setup, well-documented

---

## 🎯 **Success Criteria:**

- ✅ Production live by early December 2025
- ✅ Monthly cost ≤ $200 AUD
- ✅ No S3 migration downtime
- ✅ All integrations working (OAuth, Gmail, Xero, SMS, OpenAI)
- ✅ Australian compliance maintained
- ✅ FileMaker running in parallel for 2-3 months

---

## 📝 **Next Actions:**

1. **This Week (Nov 11):**
   - Review final deployment plan
   - Create Google Cloud account (if needed)
   - Set up billing alerts

2. **Next Week (Nov 18):**
   - Start GCP infrastructure setup
   - Begin Docker containerization for Cloud Run

3. **Before Go-Live:**
   - Test all integrations
   - Backup current database
   - Schedule Saturday night cutover window

---

## 📄 **Related Documents:**

- **Full Plan:** `docs/deployment/PRODUCTION_DEPLOYMENT_PLAN.md`
- **ChatGPT Review:** `docs/deployment/CHATGPT_REVIEW_ANALYSIS.md`
- **ChatGPT Question:** `docs/deployment/CHATGPT_HOSTING_QUESTION.md`

---

## 📊 **Current Status:**

**FileMaker Document Import:**
- Progress: 2,895 / 11,259 documents (25.7%)
- Status: Running smoothly
- ETA: ~45 minutes remaining
- Destination: AWS S3 (will stay there!) ✅

---

**Decision finalized:** November 9, 2025  
**Deployment target:** December 2025  
**Total estimated cost:** $166/month  
**Annual savings:** $768/year vs FileMaker

---

✅ **APPROVED & READY TO PROCEED**

