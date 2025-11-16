# ✅ Simple Deployment Steps

## Current Status
- ✅ Backend deployed and working
- ✅ Database schema reset (clean slate)
- ⏳ Migrations need to be run

## The Problem
Cloud Run jobs are failing due to Django contenttypes issues. The simplest solution is to run migrations locally.

## Solution: Run Migrations Locally

### Step 1: Authenticate (if not done)
```bash
gcloud auth application-default login
```

### Step 2: Run the Migration Script
```bash
./run_migrations.sh
```

**That's it!** The script will:
1. Get secrets from Secret Manager
2. Start Cloud SQL Proxy
3. Run migrations
4. Clean up

---

## Alternative: Manual Steps

If the script doesn't work, run these manually:

```bash
# 1. Get secrets
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password --project=nexus-walkeasy-prod)
export ENVIRONMENT=production
export USE_CLOUD_SQL_PROXY=1

# 2. Start proxy (in one terminal)
cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port 5432

# 3. Run migrations (in another terminal)
cd backend
source venv/bin/activate
python manage.py migrate --settings=ncc_api.settings_production --noinput
```

---

## What's Next After Migrations

1. ✅ Create superuser
2. ✅ Migrate your data (44K+ records)
3. ✅ Deploy frontend

---

**The database is clean and ready - just need to run migrations!**

