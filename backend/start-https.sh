#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Django with HTTPS...${NC}"
echo ""

cd /Users/craig/Documents/nexus-core-clinic/backend
source venv/bin/activate

echo -e "${YELLOW}📋 Your HTTPS URLs:${NC}"
echo "   Backend:  https://localhost:8000"
echo "   Admin:    https://localhost:8000/admin/"
echo "   API:      https://localhost:8000/api/"
echo "   Xero:     https://localhost:8000/xero/oauth/connect/"
echo ""
echo -e "${YELLOW}⚠️  You'll see a browser warning about the certificate - that's normal!${NC}"
echo "   Click 'Advanced' and 'Proceed' to continue"
echo ""
echo -e "${GREEN}Starting server...${NC}"
echo ""

python manage.py runserver_plus --cert-file cert.pem --key-file key.pem 0.0.0.0:8000

