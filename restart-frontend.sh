#!/bin/bash

# Script to restart the frontend development server with WebSocket fixes

echo "🔄 Restarting RADRIS Frontend with WebSocket fixes..."

# Kill any existing Next.js processes
echo "🛑 Stopping existing frontend processes..."
pkill -f "next dev" || true
sleep 2

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install

# Start the development server
echo "🚀 Starting frontend development server..."
npm run dev