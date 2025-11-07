#!/bin/bash

# Start WalkEasy Nexus in full HTTPS development mode with webhook support
# This script starts:
# - Backend HTTPS (Django runserver_plus with SSL)
# - Cloudflare Tunnel (with --no-tls-verify for self-signed certs)
# - Provides webhook URL for SMS Broadcast configuration

echo "🚀 Starting WalkEasy Nexus - Full HTTPS Development Mode with Webhooks"
echo "======================================================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared not found!"
    echo ""
    echo "Please install Cloudflare Tunnel:"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    echo ""
    exit 1
fi

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "❌ This script must be run from the backend directory"
    echo ""
    echo "Usage:"
    echo "  cd backend"
    echo "  ./start-webhook-dev.sh"
    echo ""
    exit 1
fi

# Check if certificates exist
if [ ! -f "cert.pem" ] || [ ! -f "key.pem" ]; then
    echo "❌ SSL certificates not found!"
    echo ""
    echo "Please run the certificate setup script first:"
    echo "  ./setup-safari-cert.sh"
    echo ""
    exit 1
fi

# Start Django HTTPS server
echo "📦 Starting Django HTTPS server..."
source venv/bin/activate
python manage.py runserver_plus --cert-file cert.pem --key-file key.pem 0.0.0.0:8000 > /tmp/backend-webhook-dev.log 2>&1 &
DJANGO_PID=$!
echo "   ✅ Django started (PID: $DJANGO_PID)"
echo "   🔗 Backend: https://localhost:8000"
echo ""

# Wait for Django to start
echo "⏳ Waiting for Django to start..."
sleep 3

# Test if Django is running
if curl -k https://localhost:8000/api/auth/user/ 2>&1 | grep -q "authenticated"; then
    echo "   ✅ Django is responding"
else
    echo "   ⚠️  Django might not be fully started yet (this is normal)"
fi
echo ""

# Start Cloudflare Tunnel
echo "🌐 Starting Cloudflare Tunnel (with --no-tls-verify)..."
cloudflared tunnel --url https://localhost:8000 --no-tls-verify > /tmp/cloudflare-webhook-dev.log 2>&1 &
TUNNEL_PID=$!
echo "   ✅ Tunnel started (PID: $TUNNEL_PID)"
echo ""

# Wait for tunnel to start
echo "⏳ Waiting for Cloudflare Tunnel to connect..."
sleep 5

# Extract tunnel URL
TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflare-webhook-dev.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "   ⚠️  Could not extract tunnel URL yet (still connecting)"
    echo "   Check /tmp/cloudflare-webhook-dev.log in a few seconds"
else
    echo "   ✅ Tunnel URL: $TUNNEL_URL"
fi
echo ""

echo "======================================================================"
echo "✅ DEVELOPMENT ENVIRONMENT READY"
echo "======================================================================"
echo ""
echo "🔗 URLs:"
echo "   Backend:  https://localhost:8000"
echo "   Frontend: https://localhost:3000 (start separately: cd frontend && ./start-https.sh)"
if [ ! -z "$TUNNEL_URL" ]; then
    echo "   Webhook:  $TUNNEL_URL"
fi
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start Frontend (in a separate terminal):"
echo "   cd frontend"
echo "   ./start-https.sh"
echo ""
echo "2. Accept SSL Certificate in Safari:"
echo "   - Open: https://localhost:8000/api/auth/user/"
echo "   - Click: 'Show Details' → 'visit this website' → 'Visit Website'"
echo "   - Refresh your app"
echo ""
echo "3. Configure SMS Broadcast Webhook:"
if [ ! -z "$TUNNEL_URL" ]; then
    echo "   - URL: $TUNNEL_URL/api/sms/webhook/inbound/"
else
    echo "   - Check /tmp/cloudflare-webhook-dev.log for tunnel URL"
    echo "   - URL format: https://xxx.trycloudflare.com/api/sms/webhook/inbound/"
fi
echo "   - Event: 'SMS → Receive an SMS' (NOT just 'SMS')"
echo "   - Method: POST"
echo "   - Parameters:"
echo "     • from   → \$esc.json(\$!sourceAddress)"
echo "     • to     → \$esc.json(\$!destinationAddress)"
echo "     • message → \$esc.json(\$!moContent)"
echo "     • ref    → \$esc.json(\$!metadata.apiClientRef)"
echo "     • msgref → \$esc.json(\$!metadata.apiSmsRef)"
echo ""
echo "📊 Logs:"
echo "   Django:     tail -f /tmp/backend-webhook-dev.log"
echo "   Cloudflare: tail -f /tmp/cloudflare-webhook-dev.log"
echo ""
echo "🛑 Stop Everything:"
echo "   Press Ctrl+C or run: kill $DJANGO_PID $TUNNEL_PID"
echo ""
echo "======================================================================"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $DJANGO_PID $TUNNEL_PID 2>/dev/null; echo '✅ Stopped'; exit 0" INT

echo "✅ Servers running... Press Ctrl+C to stop"
echo ""

# Keep script running
wait

