#!/bin/bash

echo "Starting Google Maps Earth Climate Visualization application..."

# Check if privatekey.json exists
if [ ! -f "privatekey.json" ]; then
    echo "Error: privatekey.json not found!"
    echo "Please add your Google Earth Engine credentials before starting the application."
    exit 1
fi

# Start the server
echo "Starting server on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""
node server.js