# 🎯 Complete Production Data Migration - Next Steps

**Backend Status:** ✅ Deployed and running  
**Database Status:** ✅ Created and ready  
**Migrations Status:** ⚠️ **Needs to be run**

---

## 🚀 **Quick Option: Use Google Cloud Console (Easiest)**

### **Step 1: Open Cloud Console**
https://console.cloud.google.com/run/detail/australia-southeast1/nexus-production-backend/logs?project=nexus-walkeasy-prod

### **Step 2: Run Migrations via Console**
1. Click on "**MIGRATIONS**" tab
2. Or use the "Execute command" option
3. Run: `python manage.py migrate`

---

## 💻 **Alternative: Command Line Migration**

### **Option A: Direct Cloud Run Exec (Recommended)**

```bash
# Connect to running Cloud Run instance and execute migrations
gcloud run services exec nexus-production-backend \
  --region=australia-southeast1 \
  --command='sh' \
  --project=nexus-walkeasy-prod

# Then inside the container:
python manage.py migrate
python manage.py createsuperuser
exit
```

### **Option B: Using Cloud SQL Proxy (If you fix auth)**

```bash
# 1. Make sure application default credentials are set
gcloud auth application-default login

# 2. Start Cloud SQL Proxy
cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port=5432 &

# 3. Run migrations locally
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate
export ENVIRONMENT=production
export USE_CLOUD_SQL_PROXY=1
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
python manage.py migrate --settings=ncc_api.settings_production
```

---

## 📊 **After Migrations: Data Import**

### **Step 1: Export Data from Local SQLite**

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate

# Export all data
python manage.py dumpdata \
  --natural-foreign \
  --natural-primary \
  --exclude=admin.logentry \
  --exclude=sessions.session \
  --exclude=contenttypes \
  --exclude=auth.permission \
  -o production_data.json

# Check file size
ls -lh production_data.json
```

### **Step 2: Import to Production**

**Option A: Via Cloud Run Exec**
```bash
# Copy data file to Cloud Run instance (this is tricky, see Option B)
```

**Option B: Via Cloud SQL Proxy** (Once auth is working)
```bash
# With proxy running and venv activated
export ENVIRONMENT=production
export USE_CLOUD_SQL_PROXY=1
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)

python manage.py loaddata production_data.json --settings=ncc_api.settings_production
```

**Option C: Using Cloud Storage** (Recommended for large data)
```bash
# 1. Upload to Cloud Storage
gsutil cp production_data.json gs://nexus-walkeasy-prod-temp/

# 2. Load from Cloud Run
gcloud run services exec nexus-production-backend \
  --region=australia-southeast1 \
  --command='sh'

# Inside container:
gsutil cp gs://nexus-walkeasy-prod-temp/production_data.json /tmp/
python manage.py loaddata /tmp/production_data.json
```

---

## ✅ **Verification**

### **Test API Endpoints:**

```bash
# Test API root
curl https://nexus-production-backend-892000689828.australia-southeast1.run.app/api/

# Test patients endpoint
curl https://nexus-production-backend-892000689828.australia-southeast1.run.app/api/patients/

# Test admin panel
open https://nexus-production-backend-892000689828.australia-southeast1.run.app/admin
```

---

## 🎯 **What Each Approach Does:**

| Approach | Migrations | Data Import | Difficulty |
|----------|------------|-------------|------------|
| **Cloud Console** | ✅ Easy | ❌ Not supported | ⭐ Easy |
| **gcloud run exec** | ✅ Medium | ✅ Via Cloud Storage | ⭐⭐ Medium |
| **Cloud SQL Proxy** | ✅ Easy | ✅ Direct | ⭐⭐⭐ Complex |

---

## 📋 **Recommended Path:**

1. **Run Migrations:** Use `gcloud run services exec` (easiest)
2. **Create Superuser:** Use same exec method
3. **Export Local Data:** Run locally
4. **Upload to Cloud Storage:** Use `gsutil`
5. **Import in Production:** Download in Cloud Run and load

---

## 🔧 **Troubleshooting Cloud SQL Proxy Auth**

If you want to use the Cloud SQL Proxy method, the authentication issue might be because the credentials aren't in the default location. Try:

```bash
# Check where credentials are stored
ls -la ~/.config/gcloud/

# Set explicit credentials path
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json"

# Then restart proxy
cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port=5432
```

---

## 🚀 **Ready to Proceed?**

**Easiest next step:**

```bash
gcloud run services exec nexus-production-backend \
  --region=australia-southeast1 \
  --command='/bin/bash'
```

Then inside the container:
```bash
python manage.py migrate
python manage.py createsuperuser
```

This will get your database tables created and admin user set up!

---

**Questions? Issues? Let me know and I'll help you through it!** 🎯

