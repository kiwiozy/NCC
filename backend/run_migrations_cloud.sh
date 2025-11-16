#!/bin/bash
# Simple script to run migrations on Cloud Run

echo "🚀 Running production migrations via Cloud Run..."
echo ""
echo "Run this command:"
echo ""
echo "gcloud run services exec nexus-production-backend --region=australia-southeast1 --command='python manage.py migrate'"
echo ""
echo "This will execute migrations directly on the production Cloud Run instance."

