# 📷 Images Import Status & Strategy

**Last Updated:** November 10, 2025  
**Status:** ⚠️ Paused - FileMaker Data API Rate Limited

---

## 📊 Current Status

### ✅ **Completed:**
- **Image Model:** Added `filemaker_id` field ✅
- **Import Script:** Created with batch limit feature ✅
- **Persistent Token:** Implemented token refresh logic ✅
- **Field Mapping:** Fixed `original_name`, `uploaded_by` fields ✅
- **Waterfall Strategy:** Download best quality image first ✅

### ❌ **Blocked:**
- **FileMaker Data API:** Returning 502 Bad Gateway
- **Root Cause:** Hit FileMaker Cloud Data API transfer limits
- **Current Usage:** 2 GB / 144 GB annual limit
- **Issue:** FileMaker Cloud is rate-limiting/throttling the API

### 📈 **Import Stats:**
- **Total Images:** 6,664
- **Imported:** 0
- **Documents Imported:** 11,396 ✅ (completed earlier)

---

## 🚨 **Problem: FileMaker Cloud Rate Limiting**

FileMaker Cloud Data API has strict rate limits:
- **Annual Limit:** 144 GB data transfer
- **Current Usage:** 2 GB (from document/image downloads)
- **Server Response:** 502 Bad Gateway (server overload/rate limiting)

### Why It's Failing:
1. **Large Image Files:** Each image is several MB
2. **Repeated Requests:** Multiple failed import attempts
3. **No Token Persistence:** Initial attempts didn't maintain persistent authentication
4. **API Throttling:** FileMaker Cloud automatically blocks excessive requests

---

## ✅ **Solutions Implemented**

### 1. Batch Import with Limits
```bash
# Import only 50 images at a time
python manage.py import_filemaker_images --limit 50

# Import only 10 images
python manage.py import_filemaker_images --limit 10
```

**Benefits:**
- Control data transfer per session
- Avoid hitting rate limits
- Easier to resume if interrupted

### 2. Persistent Authentication Token
- Automatic token refresh before expiry (15 min lifetime)
- Reuse same token across multiple requests
- Reduces authentication overhead
- Implemented `ensure_authenticated()` method

### 3. Configurable Batch Size
```bash
# Fetch 25 records per API request instead of 50
python manage.py import_filemaker_images --limit 100 --batch-size 25
```

---

## 🎯 **Recommended Import Strategy**

### **Option A: Slow & Steady (Recommended)**
Import images gradually over 1-2 weeks to avoid rate limits:

```bash
# Import 50 images per day
python manage.py import_filemaker_images --limit 50

# Wait 24 hours, then run again
# Repeat for ~133 days to import all 6,664 images
```

**Pros:**
- Won't hit FileMaker rate limits
- Safe and reliable
- No cost

**Cons:**
- Takes 4-5 months to complete
- Requires manual scheduling

---

### **Option B: Scheduled Import (Better)**
Use a cron job to import 100 images every 6 hours:

```bash
# Add to crontab
0 */6 * * * cd /Users/craig/Documents/nexus-core-clinic/backend && source venv/bin/activate && python manage.py import_filemaker_images --limit 100 >> /Users/craig/Documents/nexus-core-clinic/logs/images_import_cron.log 2>&1
```

**Pros:**
- Automated
- Spreads load over time
- Complete in ~17 days

**Cons:**
- Still relatively slow
- Dependent on FileMaker API availability

---

### **Option C: Manual Export + Direct S3 Upload (Fastest) ⭐ RECOMMENDED**
Export all images from FileMaker Desktop, upload to S3, then import metadata:

**Step 1: Export from FileMaker Desktop**
1. Open WEP-DatabaseV2 in FileMaker Pro
2. Script to export all images to a folder structure:
   ```
   exports/
   ├── {patient_id}/
   │   ├── {date}/
   │   │   ├── {image_id}.jpg
   ```

**Step 2: Upload to S3 using AWS CLI**
```bash
# Bulk upload (no FileMaker API involved)
aws s3 sync exports/ s3://nexus-documents-walkeasy/patients/filemaker-import/images/ --profile walkeasy
```

**Step 3: Import Metadata Only**
Modify script to skip file download, just create Image records:
```bash
python manage.py import_filemaker_images_metadata_only
```

**Pros:**
- **Fastest:** Complete in 1-2 hours
- **No API limits:** Direct S3 upload
- **Reliable:** No 502 errors
- **One-time:** No scheduling needed

**Cons:**
- Requires FileMaker Pro Desktop access
- Manual export step
- Need to create FileMaker export script

---

### **Option D: Upgrade FileMaker Cloud Plan**
Contact Claris to upgrade to a higher-tier plan with more Data API bandwidth.

**Pros:**
- Increases API limits
- May allow faster imports

**Cons:**
- Additional cost
- Still subject to rate limiting
- Unclear pricing

---

## 🔧 **Current Implementation**

### Import Script Location:
```
backend/images/management/commands/import_filemaker_images.py
```

### Key Features:
- `--limit`: Maximum images to import
- `--batch-size`: Records per API request
- Persistent token with auto-refresh
- Waterfall image quality strategy
- Automatic patient linking
- S3 upload with thumbnails

### Usage:
```bash
# Import 10 images
python manage.py import_filemaker_images --limit 10

# Import 50 images, fetch 25 at a time
python manage.py import_filemaker_images --limit 50 --batch-size 25

# Import all (no limit)
python manage.py import_filemaker_images
```

---

## 📋 **Next Steps**

### **Immediate (Today):**
1. ✅ Document the issue and solutions
2. ⏳ Wait 24 hours for FileMaker API to reset/cool down
3. 📝 Discuss with Craig which strategy to pursue

### **Short Term (This Week):**
- **If Option A/B:** Set up cron job for scheduled imports
- **If Option C:** Create FileMaker export script, do manual export
- **If Option D:** Contact Claris support for plan upgrade

### **Long Term:**
- Complete images import using chosen strategy
- Monitor FileMaker Data API usage
- Archive old patients/clinics after all data is imported

---

## 🎓 **Lessons Learned**

1. **FileMaker Cloud has strict API limits** - Can't bulk import large files
2. **Persistent tokens are critical** - Reduces authentication overhead
3. **Batch processing is essential** - Import in small chunks over time
4. **Manual export may be faster** - For one-time migrations, direct S3 upload is best
5. **Monitor API usage** - Check FileMaker Cloud admin panel regularly

---

## 📞 **FileMaker Cloud Data API Limits**

Based on the screenshot provided:
- **Annual Limit:** 144 GB
- **Used:** 2 GB (1.4%)
- **Remaining:** 142 GB
- **Reset Date:** March 10, 2026
- **Status:** API is returning 502 errors (rate limited or throttled)

**Note:** FileMaker may have daily/hourly limits in addition to annual limits.

---

## ✅ **Recommendation**

**I recommend Option C (Manual Export + Direct S3 Upload)** because:
- ✅ **Fastest:** Complete in 1-2 hours vs weeks/months
- ✅ **Reliable:** No API rate limits or 502 errors
- ✅ **One-time effort:** No ongoing scheduling needed
- ✅ **Clean data:** All 6,664 images guaranteed imported
- ✅ **No additional cost:** Uses existing S3 and FileMaker Desktop

**Would you like me to create the FileMaker export script?**
