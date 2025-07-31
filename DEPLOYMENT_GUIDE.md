# 🚀 Deploy Climate Visualization to Render

This guide will help you deploy your climate visualization application to Render.com.

## 📋 Prerequisites

Before deploying, make sure you have:

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Google Earth Engine Service Account**: You'll need the JSON key file
3. **Render Account**: Sign up at [render.com](https://render.com)

## 🔧 Step 1: Prepare Your Repository

### 1.1 Create a GitHub Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - Climate Visualization App"

# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### 1.2 Prepare Environment Files

Your repository should include:
- ✅ `package.json` (already configured)
- ✅ `render.yaml` (already created)
- ✅ `.env.example` (already created)
- ✅ Health check endpoint (already added)

## 🌍 Step 2: Google Earth Engine Setup

### 2.1 Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Earth Engine API**
4. Go to **IAM & Admin** → **Service Accounts**
5. Click **Create Service Account**
6. Name it `earth-engine-service`
7. Grant role: **Earth Engine Resource Admin**
8. Create and download the JSON key file

### 2.2 Register with Earth Engine

```bash
# Install Earth Engine CLI (if not already done)
pip install earthengine-api

# Authenticate (one-time setup)
earthengine authenticate

# Register your service account
earthengine set_project YOUR_GOOGLE_CLOUD_PROJECT_ID
```

## 🚀 Step 3: Deploy to Render

### 3.1 Create Web Service

1. **Login to Render**: Go to [render.com](https://render.com) and sign in
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect Repository**: Connect your GitHub repository
4. **Configure Service**:
   - **Name**: `climate-visualization`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3.2 Environment Variables

In Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=10000
```

### 3.3 Upload Service Account Key

1. **Secret Files**: In your Render service dashboard
2. **Add Secret File**:
   - **Filename**: `privatekey.json`
   - **Contents**: Paste your Google Earth Engine service account JSON key

### 3.4 Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy your app
3. You'll get a URL like: `https://climate-visualization.onrender.com`

## 🔍 Step 4: Verify Deployment

### 4.1 Check Health

Visit: `https://your-app-name.onrender.com/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 4.2 Test Earth Engine

Visit: `https://your-app-name.onrender.com/test-ee`

Should return:
```json
{
  "success": true,
  "message": "Earth Engine initialized successfully"
}
```

### 4.3 Test Application

1. **Main App**: `https://your-app-name.onrender.com/`
2. **Test Fixes**: `https://your-app-name.onrender.com/test-fixes`
3. **Global Test**: `https://your-app-name.onrender.com/test-global`

## ⚙️ Step 5: Configuration Options

### 5.1 Custom Domain (Optional)

1. In Render dashboard → **Settings**
2. **Custom Domains** → **Add Custom Domain**
3. Follow DNS configuration instructions

### 5.2 Environment Variables

You can add additional environment variables:

```
# Optional: Restrict Google Maps API usage
GOOGLE_MAPS_API_KEY=your_api_key_here

# Optional: App configuration
APP_NAME=Climate Visualization
APP_VERSION=1.0.0
```

### 5.3 Scaling (Paid Plans)

For production use, consider upgrading to:
- **Starter Plan**: $7/month - Better performance
- **Standard Plan**: $25/month - Auto-scaling

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Check your package.json dependencies
npm install
npm start
```

#### 2. Earth Engine Authentication Error
- Verify service account JSON is uploaded correctly
- Check that Earth Engine API is enabled
- Ensure service account has proper permissions

#### 3. App Crashes on Startup
- Check Render logs in dashboard
- Verify all environment variables are set
- Test locally first: `NODE_ENV=production npm start`

#### 4. Slow Cold Starts
- Render free tier has cold starts
- Consider upgrading to paid plan for always-on service

### Debug Commands

```bash
# Check logs in Render dashboard
# Or test locally:

# Install dependencies
npm install

# Test production mode locally
NODE_ENV=production npm start

# Test specific endpoints
curl http://localhost:3000/health
curl http://localhost:3000/test-ee
```

## 📊 Monitoring

### 5.1 Render Dashboard

Monitor your app in Render dashboard:
- **Metrics**: CPU, Memory, Response times
- **Logs**: Real-time application logs
- **Events**: Deployment history

### 5.2 Custom Monitoring

Add monitoring endpoints:

```javascript
// Already included in server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🔒 Security Considerations

### Production Security

1. **HTTPS**: Render provides free SSL certificates
2. **Environment Variables**: Never commit secrets to git
3. **Service Account**: Use least-privilege principle
4. **CORS**: Configure if needed for API access

### Best Practices

```javascript
// Already implemented in server.js
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  // Security headers added
}
```

## 🎉 Success!

Your climate visualization app should now be live at:
`https://your-app-name.onrender.com`

### Next Steps

1. **Test all features** using the test pages
2. **Monitor performance** in Render dashboard
3. **Set up custom domain** if desired
4. **Consider upgrading** to paid plan for production use

## 📞 Support

If you encounter issues:

1. **Check Render Logs**: Dashboard → Logs
2. **Test Locally**: Reproduce issues locally first
3. **Render Support**: [render.com/docs](https://render.com/docs)
4. **Earth Engine Support**: [developers.google.com/earth-engine](https://developers.google.com/earth-engine)

---

**🌍 Your climate visualization app is now ready to help users understand climate change impacts globally!**