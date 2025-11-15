#!/bin/bash
# Production Migration Script

echo "🚀 Running production database migrations..."

# Set environment variables for production
export ENVIRONMENT=production
export DJANGO_SETTINGS_MODULE=ncc_api.settings_production

# Get secrets from Secret Manager
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key)
export AWS_ACCESS_KEY_ID=$(gcloud secrets versions access latest --secret=aws-access-key-id)
export AWS_SECRET_ACCESS_KEY=$(gcloud secrets versions access latest --secret=aws-secret-access-key)

# Connect to Cloud SQL via proxy
echo "📡 Starting Cloud SQL proxy..."
cloud_sql_proxy -instances=nexus-walkeasy-prod:australia-southeast1:nexus-production-db=tcp:5432 &
PROXY_PID=$!

# Wait for proxy to connect
sleep 5

# Set database connection for proxy
export DATABASE_HOST=127.0.0.1
export DATABASE_PORT=5432

# Run migrations
echo "🔄 Running migrations..."
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py migrate --settings=ncc_api.settings_production

echo "✅ Migrations complete!"

# Kill proxy
kill $PROXY_PID

echo "🎉 Done!"

