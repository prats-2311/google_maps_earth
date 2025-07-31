#!/bin/bash

# Climate Visualization - Deployment Script
# This script helps prepare and deploy your app to Render

echo "🚀 Climate Visualization - Deployment Preparation"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Initializing..."
    git init
    echo "✅ Git initialized"
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  No git remote found."
    echo "Please add your GitHub repository:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    exit 1
fi

# Check for required files
echo ""
echo "🔍 Checking required files..."

required_files=("package.json" "server.js" "render.yaml" ".env.example" "DEPLOYMENT_GUIDE.md")
missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo ""
    echo "❌ Missing required files. Please ensure all files are present."
    exit 1
fi

# Check for Google Earth Engine key
echo ""
echo "🔑 Checking Google Earth Engine setup..."

if [ -f "privatekey.json" ]; then
    echo "✅ privatekey.json found (will be uploaded to Render separately)"
    echo "⚠️  Remember: DO NOT commit this file to git!"
else
    echo "⚠️  privatekey.json not found"
    echo "You'll need to:"
    echo "1. Create a Google Earth Engine service account"
    echo "2. Download the JSON key file"
    echo "3. Upload it as a secret file in Render dashboard"
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
if npm list > /dev/null 2>&1; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Test the application
echo ""
echo "🧪 Testing application..."
echo "Starting server for 10 seconds to test..."

# Start server in background
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed (this might be normal if Earth Engine isn't configured)"
fi

# Stop the server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Prepare for deployment
echo ""
echo "📝 Preparing for deployment..."

# Add all files to git
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    echo "📝 Committing changes..."
    git commit -m "Prepare for Render deployment - $(date)"
    echo "✅ Changes committed"
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "⚠️  Push failed. You may need to set up your GitHub repository first."
    echo "Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com and create a new Web Service"
echo "2. Connect your GitHub repository"
echo "3. Use these settings:"
echo "   - Environment: Node"
echo "   - Build Command: npm install"
echo "   - Start Command: npm start"
echo "4. Add environment variable: NODE_ENV=production"
echo "5. Upload privatekey.json as a secret file"
echo "6. Deploy!"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🌍 Your app will be available at: https://your-app-name.onrender.com"