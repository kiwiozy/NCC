#!/bin/bash

echo "Starting Cloudflare Tunnel..."
echo "The public URL will appear below:"
echo "================================"

cloudflared tunnel --url https://localhost:8000 --no-tls-verify


