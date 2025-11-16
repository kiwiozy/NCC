#!/bin/bash
# Simple script to run migrations - run this manually

set -e

echo "🚀 Running Production Migrations"
echo ""

# Get secrets
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password --project=nexus-walkeasy-prod)
export ENVIRONMENT=production
export USE_CLOUD_SQL_PROXY=1

cd "$(dirname "$0")/backend"

# Activate venv
source venv/bin/activate

# Start proxy in background
echo "Starting Cloud SQL Proxy..."
cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port 5432 &
PROXY_PID=$!
sleep 5

# Run migrations
echo "Running migrations..."
python manage.py migrate --settings=ncc_api.settings_production --noinput

# Kill proxy
kill $PROXY_PID 2>/dev/null || true

echo ""
echo "✅ Migrations complete!"

