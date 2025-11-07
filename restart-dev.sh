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
echo -e "${YELLOW}Waiting 2 seconds...${NC}"
sleep 2

echo ""
echo -e "${GREEN}Starting all services...${NC}"
echo ""
./start-dev.sh

