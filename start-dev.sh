#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory
mkdir -p logs

# PID file to track processes
PID_FILE="$SCRIPT_DIR/.dev-pids"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}========================================"
    echo -e "🛑 Shutting down all services..."
    echo -e "========================================${NC}"
    
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${CYAN}Stopping process $pid${NC}"
                kill $pid 2>/dev/null
            fi
        done < "$PID_FILE"
        rm "$PID_FILE"
    fi
    
    # Kill any remaining processes
    pkill -f "manage.py runserver" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    pkill -f "ngrok http" 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

echo -e "${MAGENTA}"
echo "========================================"
echo "🚀 WalkEasy Nexus Development Startup"
echo "========================================"
echo -e "${NC}"

# Clear PID file
> "$PID_FILE"

# ============================================
# 1. Start Django Backend
# ============================================
echo -e "${BLUE}[1/3] Starting Django Backend...${NC}"

# Check if Django is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 8000 already in use. Killing existing process...${NC}"
    kill $(lsof -t -i:8000) 2>/dev/null
    sleep 2
fi

cd "$SCRIPT_DIR/backend"

# Use virtual environment Python if it exists
if [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
    echo -e "${CYAN}✅ Using Python virtual environment${NC}"
else
    PYTHON_CMD="python3"
    echo -e "${YELLOW}⚠️  No virtual environment found, using system python3${NC}"
fi

$PYTHON_CMD -u manage.py runserver_plus --cert-file cert.pem --key-file key.pem 0.0.0.0:8000 > "$SCRIPT_DIR/logs/django.log" 2>&1 &
DJANGO_PID=$!
echo $DJANGO_PID >> "$PID_FILE"
cd "$SCRIPT_DIR"

# Wait for Django to start
echo -e "${CYAN}Waiting for Django to start...${NC}"
for i in {1..10}; do
    if curl -s -k https://localhost:8000/api/patients/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Django Backend started (PID: $DJANGO_PID)${NC}"
        echo -e "${GREEN}   → https://localhost:8000${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Django failed to start. Check logs/django.log${NC}"
        cleanup
    fi
    sleep 1
done

echo ""

# ============================================
# 2. Start Next.js Frontend with HTTPS
# ============================================
echo -e "${BLUE}[2/3] Starting Next.js Frontend (HTTPS)...${NC}"

# Check if Next.js is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 already in use. Killing existing process...${NC}"
    kill $(lsof -t -i:3000) 2>/dev/null
    sleep 2
fi
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 already in use. Killing existing process...${NC}"
    kill $(lsof -t -i:3001) 2>/dev/null
    sleep 2
fi

cd "$SCRIPT_DIR/frontend"

# Start Next.js on port 3001 (HTTP)
npm run dev -- -p 3001 > "$SCRIPT_DIR/logs/nextjs.log" 2>&1 &
NEXTJS_PID=$!
echo $NEXTJS_PID >> "$PID_FILE"

# Start SSL proxy (HTTPS 3000 -> HTTP 3001)
npx local-ssl-proxy --source 3000 --target 3001 --cert localhost+2.pem --key localhost+2-key.pem > "$SCRIPT_DIR/logs/nextjs-ssl.log" 2>&1 &
SSL_PROXY_PID=$!
echo $SSL_PROXY_PID >> "$PID_FILE"

cd "$SCRIPT_DIR"

# Wait for Next.js to start
echo -e "${CYAN}Waiting for Next.js to start...${NC}"
for i in {1..15}; do
    if curl -s -k https://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Next.js Frontend started (PID: $NEXTJS_PID, SSL: $SSL_PROXY_PID)${NC}"
        echo -e "${GREEN}   → https://localhost:3000${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ Next.js failed to start. Check logs/nextjs.log${NC}"
        cleanup
    fi
    sleep 1
done

echo ""

# ============================================
# 3. Start ngrok Tunnel
# ============================================
echo -e "${BLUE}[3/3] Starting ngrok Tunnel for SMS Webhooks...${NC}"

# Check if ngrok is already running
if pgrep -f "ngrok http" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  ngrok already running. Killing existing process...${NC}"
    pkill -f "ngrok http" 2>/dev/null
    sleep 2
fi

# Check if ngrok is configured
if ! ngrok config check > /dev/null 2>&1; then
    echo -e "${RED}❌ ngrok not configured. Please run: ngrok config add-authtoken YOUR_TOKEN${NC}"
    cleanup
fi

ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev https://localhost:8000 --log=stdout > "$SCRIPT_DIR/logs/ngrok.log" 2>&1 &
NGROK_PID=$!
echo $NGROK_PID >> "$PID_FILE"

# Wait for ngrok to start
echo -e "${CYAN}Waiting for ngrok tunnel to start...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ngrok Tunnel started (PID: $NGROK_PID)${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}⚠️  ngrok may have failed to start. Check logs/ngrok.log${NC}"
    fi
    sleep 1
done

echo ""
echo -e "${MAGENTA}"
echo "========================================"
echo "✨ All Services Running!"
echo "========================================"
echo -e "${NC}"
echo -e "${GREEN}📱 Frontend (HTTPS):${NC}   https://localhost:3000"
echo -e "${GREEN}🔧 Backend API (HTTPS):${NC} https://localhost:8000"
echo -e "${GREEN}🌐 ngrok Dashboard:${NC}     http://localhost:4040"
echo ""
echo -e "${CYAN}🔔 SMS Webhook URL:${NC}"
echo -e "${YELLOW}   → https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/${NC}"
echo ""
echo -e "${MAGENTA}========================================"
echo -e "📋 Logs Location: ./logs/"
echo -e "   • django.log      - Django backend logs"
echo -e "   • nextjs.log      - Next.js frontend logs"
echo -e "   • nextjs-ssl.log  - SSL proxy logs"
echo -e "   • ngrok.log       - ngrok tunnel logs"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  Certificate Warnings:${NC}"
echo -e "${CYAN}   First time accessing https://localhost:8000 or https://localhost:3000:${NC}"
echo -e "${CYAN}   1. Browser will show certificate warning${NC}"
echo -e "${CYAN}   2. Click 'Advanced' or 'Show Details'${NC}"
echo -e "${CYAN}   3. Click 'Proceed to localhost' or 'visit this website'${NC}"
echo -e "${CYAN}   This is normal for local development with self-signed certificates${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and monitor processes
while true; do
    # Check if any process died
    for pid in $(cat "$PID_FILE" 2>/dev/null); do
        if ! ps -p $pid > /dev/null 2>&1; then
            echo -e "${RED}❌ Process $pid died unexpectedly${NC}"
            cleanup
        fi
    done
    sleep 5
done

