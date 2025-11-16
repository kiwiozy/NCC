# 🚀 Deploy Nexus to Production - Step by Step

## Current Status
- ✅ Backend deployed and working
- ⏳ Database migrations needed
- ⏳ Data migration needed  
- ⏳ Frontend deployment needed

---

## Step 1: Authenticate (One-time setup)

```bash
# Authenticate for Cloud SQL Proxy
gcloud auth application-default login
```

**This will open a browser - complete the authentication.**

---

## Step 2: Run Database Migrations

```bash
# Start Cloud SQL Proxy (in one terminal, leave it running)
cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port 5432

# In another terminal, run migrations
cd /Users/craig/Documents/nexus-core-clinic/backend
export USE_CLOUD_SQL_PROXY=1
export ENVIRONMENT=production
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export DB_PASSWORD="YOUR_DB_PASSWORD_HERE"  # Get from Cloud SQL instance

python manage.py migrate --settings=ncc_api.settings_production --noinput
```

**Note:** You'll need the database password. Get it from:
- Google Cloud Console → SQL → nexus-production-db → Users
- Or reset it if needed

---

## Step 3: Create Superuser

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend
export USE_CLOUD_SQL_PROXY=1
export ENVIRONMENT=production
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export DB_PASSWORD="YOUR_DB_PASSWORD_HERE"

python manage.py createsuperuser --settings=ncc_api.settings_production
```

---

## Step 4: Migrate Your Data

```bash
cd /Users/craig/Documents/nexus-core-clinic/backend

# Export from local SQLite
python manage.py dumpdata \
  --natural-foreign \
  --natural-primary \
  --exclude=admin.logentry \
  --exclude=sessions.session \
  --exclude=contenttypes.contenttype \
  --exclude=auth.permission \
  -o /tmp/nexus_production_data.json

# Import to production (with proxy running)
export USE_CLOUD_SQL_PROXY=1
export ENVIRONMENT=production
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export DB_PASSWORD="YOUR_DB_PASSWORD_HERE"

python manage.py loaddata /tmp/nexus_production_data.json --settings=ncc_api.settings_production
```

---

## Step 5: Deploy Frontend

```bash
cd /Users/craig/Documents/nexus-core-clinic/frontend

# Create production environment file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://nexus-production-backend-892000689828.australia-southeast1.run.app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA9ubuJ8vpf70GxfAzzDIdpPtKfwawQLrk
EOF

# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting --project referrer-map
```

---

## Quick All-in-One Script

Or run the automated script:

```bash
./deploy-to-production.sh
```

**This script will guide you through each step interactively.**

---

## Need Help?

- **Backend URL:** https://nexus-production-backend-892000689828.australia-southeast1.run.app
- **Database:** Cloud SQL PostgreSQL (nexus-production-db)
- **Project:** nexus-walkeasy-prod

