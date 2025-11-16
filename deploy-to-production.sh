#!/bin/bash
# Complete deployment script for Nexus to production
# This script will:
# 1. Run database migrations
# 2. Create superuser (if needed)
# 3. Migrate data from local SQLite to production
# 4. Deploy frontend

set -e

echo "🚀 Starting Nexus Production Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK.${NC}"
    exit 1
fi

if ! command -v cloud-sql-proxy &> /dev/null; then
    echo -e "${YELLOW}⚠️  Cloud SQL Proxy not found. Installing...${NC}"
    brew install cloud-sql-proxy || {
        echo -e "${RED}❌ Failed to install Cloud SQL Proxy${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Prerequisites check complete${NC}"
echo ""

# Step 1: Start Cloud SQL Proxy
echo "🔌 Step 1: Starting Cloud SQL Proxy..."
PROXY_PID=$(pgrep -f "cloud-sql-proxy.*nexus-production-db" || echo "")

if [ -z "$PROXY_PID" ]; then
    echo "Starting proxy in background..."
    cloud-sql-proxy nexus-walkeasy-prod:australia-southeast1:nexus-production-db --port 5432 > /tmp/cloud-sql-proxy.log 2>&1 &
    PROXY_PID=$!
    sleep 5
    
    if ! pgrep -f "cloud-sql-proxy.*nexus-production-db" > /dev/null; then
        echo -e "${RED}❌ Failed to start Cloud SQL Proxy${NC}"
        echo "Check authentication: gcloud auth application-default login"
        exit 1
    fi
    echo -e "${GREEN}✅ Proxy started (PID: $PROXY_PID)${NC}"
else
    echo -e "${GREEN}✅ Proxy already running (PID: $PROXY_PID)${NC}"
fi
echo ""

# Step 2: Run Migrations
echo "🗄️  Step 2: Running database migrations..."
cd "$(dirname "$0")/backend"

export ENVIRONMENT=production
export SECRET_KEY=$(gcloud secrets versions access latest --secret=django-secret-key --project=nexus-walkeasy-prod 2>/dev/null || echo "")

if [ -z "$SECRET_KEY" ]; then
    echo -e "${RED}❌ Failed to get SECRET_KEY from Secret Manager${NC}"
    exit 1
fi

python manage.py migrate --settings=ncc_api.settings_production --noinput
echo -e "${GREEN}✅ Migrations complete!${NC}"
echo ""

# Step 3: Ask about superuser
echo "👤 Step 3: Superuser account"
read -p "Create superuser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser --settings=ncc_api.settings_production
    echo -e "${GREEN}✅ Superuser created${NC}"
fi
echo ""

# Step 4: Migrate Data
echo "📦 Step 4: Migrate data from local SQLite"
read -p "Export and migrate data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Exporting data from local SQLite..."
    python manage.py dumpdata --natural-foreign --natural-primary \
        --exclude=admin.logentry \
        --exclude=sessions.session \
        --exclude=contenttypes.contenttype \
        --exclude=auth.permission \
        -o /tmp/nexus_production_data.json
    
    echo "Importing to production..."
    python manage.py loaddata /tmp/nexus_production_data.json --settings=ncc_api.settings_production
    echo -e "${GREEN}✅ Data migration complete!${NC}"
fi
echo ""

# Step 5: Deploy Frontend
echo "🎨 Step 5: Deploy frontend"
read -p "Deploy frontend to production? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$(dirname "$0")/frontend"
    
    # Create production env file
    cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://nexus-production-backend-892000689828.australia-southeast1.run.app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA9ubuJ8vpf70GxfAzzDIdpPtKfwawQLrk
EOF
    
    echo "Building frontend..."
    npm run build
    
    echo "Deploying to Firebase Hosting..."
    firebase deploy --only hosting --project referrer-map
    
    echo -e "${GREEN}✅ Frontend deployed!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Backend: https://nexus-production-backend-892000689828.australia-southeast1.run.app"
echo "Frontend: Check Firebase Hosting URL"

