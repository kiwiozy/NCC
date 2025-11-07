#!/bin/bash

echo "========================================"
echo "🚀 Starting ngrok tunnel for SMS Webhook"
echo "========================================"
echo ""
echo "Your permanent webhook URL:"
echo "https://ignacio-interposable-uniformly.ngrok-free.dev"
echo ""
echo "SMS Broadcast webhook URL to configure:"
echo "https://ignacio-interposable-uniformly.ngrok-free.dev/api/sms/webhook/inbound/"
echo ""
echo "========================================"
echo ""

# Start ngrok with your static domain (forwards to HTTPS backend)
ngrok http --domain=ignacio-interposable-uniformly.ngrok-free.dev https://localhost:8000

