#!/bin/bash
set -e

echo "🔨 Building CaddyAdmin..."

# Build Frontend
echo "📦 Building frontend..."
cd apps/web
npm ci
npm run build

# Copy to backend static
echo "📋 Copying frontend assets..."
rm -rf ../backend/static/*
cp -r out/* ../backend/static/

# Build Backend
echo "🔧 Building backend..."
cd ../backend
CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../caddyadmin main.go

echo ""
echo "✅ Build complete!"
echo "   Binary: ./caddyadmin"
echo "   Run with: ./caddyadmin"
