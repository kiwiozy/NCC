#!/bin/bash
# Update Google Maps API Key Script
# This script updates the Google Maps API key in environment files

NEW_KEY="AIzaSyA9ubuJ8vpf70GxfAzzDIdpPtKfwawQLrk"
OLD_KEY="AIzaSyAbvJRf7cMD-BhpzmMFZ2HfoqSPhMBd668"

echo "🔑 Updating Google Maps API Key..."
echo ""

# Check if .env file exists in backend
if [ -f "backend/.env" ]; then
    echo "📝 Updating backend/.env..."
    if grep -q "$OLD_KEY" backend/.env 2>/dev/null; then
        sed -i '' "s/$OLD_KEY/$NEW_KEY/g" backend/.env
        echo "✅ Updated backend/.env"
    else
        echo "ℹ️  Old key not found in backend/.env (may already be updated)"
    fi
else
    echo "ℹ️  backend/.env not found (may be in .gitignore)"
fi

# Check if .env.local exists in frontend
if [ -f "frontend/.env.local" ]; then
    echo "📝 Updating frontend/.env.local..."
    if grep -q "$OLD_KEY" frontend/.env.local 2>/dev/null; then
        sed -i '' "s/$OLD_KEY/$NEW_KEY/g" frontend/.env.local
        echo "✅ Updated frontend/.env.local"
    else
        echo "ℹ️  Old key not found in frontend/.env.local (may already be updated)"
    fi
else
    echo "ℹ️  frontend/.env.local not found"
fi

# Check if .env exists in frontend
if [ -f "frontend/.env" ]; then
    echo "📝 Updating frontend/.env..."
    if grep -q "$OLD_KEY" frontend/.env 2>/dev/null; then
        sed -i '' "s/$OLD_KEY/$NEW_KEY/g" frontend/.env
        echo "✅ Updated frontend/.env"
    else
        echo "ℹ️  Old key not found in frontend/.env (may already be updated)"
    fi
else
    echo "ℹ️  frontend/.env not found"
fi

# Check for VITE_GOOGLE_MAPS_API_KEY pattern
echo ""
echo "🔍 Searching for Google Maps API key references..."
if grep -r "VITE_GOOGLE_MAPS_API_KEY\|NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" . --include="*.env*" --include="*.local" 2>/dev/null | grep -v ".git" | grep -v "node_modules"; then
    echo "✅ Found references (check above)"
else
    echo "ℹ️  No additional references found"
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "📋 New API Key: $NEW_KEY"
echo "⚠️  Old key has been deleted from Google Cloud"
echo ""
echo "💡 If you have the key in other places (Firebase, production env vars, etc.),"
echo "   update them manually with the new key above."

