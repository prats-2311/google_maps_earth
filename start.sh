#!/bin/bash

echo "Starting Google Maps Earth Climate Visualization application..."

# Check if privatekey.json exists
if [ ! -f "privatekey.json" ]; then
    echo "Error: privatekey.json not found!"
    echo "Please add your Google Earth Engine credentials before starting the application."
    exit 1
fi

# Kill any existing process on port 3000
echo "Checking for existing processes on port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "Found existing process on port 3000, terminating..."
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    sleep 2
fi

# Start the server
echo "Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "Available endpoints:"
echo "  - Main app: http://localhost:3000/"
echo "  - Test page: http://localhost:3000/test"
echo "  - Earth Engine test: http://localhost:3000/test-ee"
echo ""
node server.js