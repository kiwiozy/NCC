#!/bin/bash

# Safari-Trusted HTTPS Certificate Setup Script
# This creates a locally-trusted development certificate that Safari will accept

echo "🔐 Setting up Safari-trusted HTTPS certificate..."
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed."
    echo "   Install it from: https://brew.sh"
    exit 1
fi

# Install mkcert if not already installed
if ! command -v mkcert &> /dev/null; then
    echo "📦 Installing mkcert..."
    brew install mkcert
    brew install nss  # For Firefox support (optional)
fi

# Set up local CA
echo "🔑 Setting up local Certificate Authority..."
mkcert -install

# Create certificates for localhost
echo "📜 Generating certificates for localhost..."
cd /Users/craig/Documents/nexus-core-clinic/backend

mkcert localhost 127.0.0.1 ::1

# Rename certificates for Django
mv localhost+2.pem cert.pem
mv localhost+2-key.pem key.pem

echo ""
echo "✅ Safari-trusted certificate created!"
echo ""
echo "📁 Certificate files:"
echo "   - cert.pem"
echo "   - key.pem"
echo ""
echo "🎉 Safari will now trust your local HTTPS server!"
echo ""
echo "🚀 Next: Restart Django with the new certificates"
echo "   Run: ./start-https.sh"

