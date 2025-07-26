#!/bin/bash

echo "Setting up Google Maps Earth Climate Visualization project..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if privatekey.json exists
if [ -f "privatekey.json" ]; then
    echo "Google Earth Engine private key found."
else
    echo "Warning: privatekey.json not found. Please add your Google Earth Engine credentials."
fi

# Instructions for running the application
echo ""
echo "Setup complete!"
echo ""
echo "To start the application, run:"
echo "npm start"
echo ""
echo "Then open your browser and navigate to: http://localhost:3000"
echo ""
echo "Note: Make sure to add your Google Maps API key in public/index.html before running the application."