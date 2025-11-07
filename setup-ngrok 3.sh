#!/bin/bash
# Quick script to start ngrok for SMS webhooks

echo "🚀 Starting ngrok for SMS webhooks..."
echo ""
echo "This will make your local server publicly accessible."
echo "Press Ctrl+C to stop ngrok when done."
echo ""

# Kill any existing ngrok processes
pkill -f "ngrok http" 2>/dev/null

# Start ngrok
ngrok http 8000

