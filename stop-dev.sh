#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}"
echo "========================================"
echo "🛑 Stopping WalkEasy Nexus Development"
echo "========================================"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$SCRIPT_DIR/.dev-pids"

# Stop processes from PID file
if [ -f "$PID_FILE" ]; then
    echo -e "${YELLOW}Stopping tracked processes...${NC}"
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Stopped process $pid${NC}"
            kill $pid 2>/dev/null
        fi
    done < "$PID_FILE"
    rm "$PID_FILE"
fi

# Kill any remaining processes
echo -e "${YELLOW}Stopping Django backend...${NC}"
pkill -f "manage.py runserver" 2>/dev/null && echo -e "${GREEN}✅ Django stopped${NC}"
pkill -f "runserver_plus" 2>/dev/null

echo -e "${YELLOW}Stopping Next.js frontend...${NC}"
pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✅ Next.js stopped${NC}"

echo -e "${YELLOW}Stopping SSL proxy...${NC}"
pkill -f "local-ssl-proxy" 2>/dev/null && echo -e "${GREEN}✅ SSL proxy stopped${NC}"

echo -e "${YELLOW}Stopping ngrok tunnel...${NC}"
pkill -f "ngrok http" 2>/dev/null && echo -e "${GREEN}✅ ngrok stopped${NC}"

# Kill by port if still running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Force killing process on port 8000...${NC}"
    kill $(lsof -t -i:8000) 2>/dev/null
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Force killing process on port 3000...${NC}"
    kill $(lsof -t -i:3000) 2>/dev/null
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Force killing process on port 3001...${NC}"
    kill $(lsof -t -i:3001) 2>/dev/null
fi

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""

