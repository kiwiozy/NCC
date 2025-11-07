#!/bin/bash

echo "========================================"
echo "🚀 Starting SMS Webhook Development Setup"
echo "========================================"
echo ""

# Check if Django is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Django backend already running on port 8000"
else
    echo "🔄 Starting Django backend..."
    cd backend
    python manage.py runserver 8000 > ../logs/django.log 2>&1 &
    DJANGO_PID=$!
    echo "✅ Django started (PID: $DJANGO_PID)"
    cd ..
    sleep 3
fi

echo ""
echo "🔄 Starting ngrok tunnel..."
echo ""
echo "Your permanent webhook URL:"
echo "👉 https://ignacio-interposable-uniformly.ngrok-free.dev"
echo ""
echo "SMS Broadcast webhook URL to configure:"
echo "👉 https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/"
echo ""
echo "========================================"
echo "Press Ctrl+C to stop the tunnel"
echo "========================================"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start ngrok with your static domain
ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev https://localhost:8000

