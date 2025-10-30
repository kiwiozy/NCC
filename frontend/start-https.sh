#!/bin/bash

echo "🚀 Starting Next.js with HTTPS..."
echo ""
echo "📋 Your HTTPS URLs:"
echo "   Frontend: https://localhost:3000"
echo "   Calendar: https://localhost:3000/"
echo "   Xero:     https://localhost:3000/xero"
echo ""
echo "✅ Using trusted mkcert certificates - no browser warnings!"
echo ""
echo "Starting servers..."
echo ""

# Start Next.js on port 3001 (HTTP)
npm run dev -- -p 3001 &
NEXTJS_PID=$!

# Wait for Next.js to start
sleep 5

# Start SSL proxy to forward HTTPS (3000) -> HTTP (3001)
npx local-ssl-proxy --source 3000 --target 3001 --cert localhost+2.pem --key localhost+2-key.pem

# Cleanup on exit
trap "kill $NEXTJS_PID" EXIT

