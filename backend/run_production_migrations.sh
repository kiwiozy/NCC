#!/bin/bash
# Run Django migrations in production via Cloud Run

set -e

echo "🚀 Running production database migrations..."

# Get secrets
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod)
export ENVIRONMENT=production

# Set database password (if needed)
export DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password --project=nexus-walkeasy-prod 2>/dev/null || echo "")

# Run migrations
cd /Users/craig/Documents/nexus-core-clinic/backend
python manage.py migrate --settings=ncc_api.settings_production --noinput

echo "✅ Migrations complete!"
