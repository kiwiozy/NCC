#!/bin/bash

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${YELLOW}"
echo "========================================"
echo "🔄 Restarting WalkEasy Nexus Development"
echo "========================================"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Stop all services
echo -e "${YELLOW}Stopping all services...${NC}"
./stop-dev.sh

echo ""
echo -e "${YELLOW}Waiting 3 seconds...${NC}"
sleep 3

echo ""
echo -e "${GREEN}Starting all services in background...${NC}"
echo ""

# Start in background and detach
nohup ./start-dev.sh > /dev/null 2>&1 &

# Wait a moment for services to start
sleep 5

echo ""
echo -e "${GREEN}✅ Services are starting in the background${NC}"
echo ""
echo -e "${YELLOW}Use './status-dev.sh' to check if all services are running${NC}"
echo -e "${YELLOW}Use './stop-dev.sh' to stop all services${NC}"
echo ""

