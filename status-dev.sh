#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}"
echo "========================================"
echo "📊 WalkEasy Nexus Status Check"
echo "========================================"
echo -e "${NC}"

# Check Django Backend
echo -e "${BLUE}🔧 Django Backend (Port 8000 HTTPS):${NC}"
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -t -i:8000)
    echo -e "${GREEN}   ✅ Running (PID: $PID)${NC}"
    if curl -s -k https://localhost:8000/api/patients/ > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ API responding${NC}"
        echo -e "${CYAN}   → https://localhost:8000${NC}"
    else
        echo -e "${RED}   ⚠️  Process running but API not responding${NC}"
    fi
else
    echo -e "${RED}   ❌ Not running${NC}"
fi

echo ""

# Check Next.js Frontend
echo -e "${BLUE}📱 Next.js Frontend (Port 3000 HTTPS):${NC}"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -t -i:3000)
    echo -e "${GREEN}   ✅ Running (PID: $PID)${NC}"
    if curl -s -k https://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Frontend responding${NC}"
        echo -e "${CYAN}   → https://localhost:3000${NC}"
    else
        echo -e "${RED}   ⚠️  Process running but frontend not responding${NC}"
    fi
else
    echo -e "${RED}   ❌ Not running${NC}"
fi

# Check if port 3001 is also running (Next.js HTTP backend)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID3001=$(lsof -t -i:3001)
    echo -e "${CYAN}   ℹ️  Next.js HTTP backend on port 3001 (PID: $PID3001)${NC}"
fi

echo ""

# Check ngrok Tunnel
echo -e "${BLUE}🌐 ngrok Tunnel:${NC}"
if pgrep -f "ngrok http" > /dev/null 2>&1; then
    PID=$(pgrep -f "ngrok http")
    echo -e "${GREEN}   ✅ Running (PID: $PID)${NC}"
    
    # Try to get tunnel info from ngrok API
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
        if [ ! -z "$TUNNEL_URL" ]; then
            echo -e "${GREEN}   ✅ Tunnel active${NC}"
            echo -e "${CYAN}   → $TUNNEL_URL${NC}"
            echo -e "${YELLOW}   📱 SMS Webhook:${NC}"
            echo -e "${CYAN}   → ${TUNNEL_URL}/api/sms/webhook/inbound/${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Tunnel starting...${NC}"
        fi
        echo -e "${CYAN}   → ngrok dashboard: http://localhost:4040${NC}"
    else
        echo -e "${YELLOW}   ⚠️  ngrok API not responding${NC}"
    fi
else
    echo -e "${RED}   ❌ Not running${NC}"
    echo -e "${YELLOW}   Expected URL: https://ignacio-interposable-uniformly.ngrok-free.dev${NC}"
fi

echo ""
echo -e "${MAGENTA}========================================"

# Check log files
if [ -d "logs" ]; then
    echo -e "${BLUE}📋 Recent Logs:${NC}"
    
    if [ -f "logs/django.log" ]; then
        DJANGO_LINES=$(wc -l < logs/django.log)
        echo -e "${CYAN}   • django.log: $DJANGO_LINES lines${NC}"
    fi
    
    if [ -f "logs/nextjs.log" ]; then
        NEXTJS_LINES=$(wc -l < logs/nextjs.log)
        echo -e "${CYAN}   • nextjs.log: $NEXTJS_LINES lines${NC}"
    fi
    
    if [ -f "logs/ngrok.log" ]; then
        NGROK_LINES=$(wc -l < logs/ngrok.log)
        echo -e "${CYAN}   • ngrok.log: $NGROK_LINES lines${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}View logs: tail -f logs/django.log${NC}"
    echo -e "${MAGENTA}========================================"
fi

echo -e "${NC}"

