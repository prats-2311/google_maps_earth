# Deployment Setup Guide

## Google Earth Engine Authentication for Production

When deploying to Render (or any cloud platform), you need to set up authentication using environment variables instead of local files.

### Step 1: Get Your Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Find your Earth Engine service account
4. Click on it and go to the "Keys" tab
5. Download the JSON key file (if you don't have one, create a new key)

### Step 2: Set Up Environment Variable in Render

1. Go to your Render dashboard
2. Select your web service
3. Go to the "Environment" tab
4. Add a new environment variable:
   - **Key**: `GOOGLE_EARTH_ENGINE_KEY`
   - **Value**: The entire content of your JSON key file (copy and paste the whole JSON)

### Step 3: Format the JSON Key

The JSON key should look something like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYour-private-key-content\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
```

**Important**: Copy the entire JSON content as a single line or preserve the formatting exactly as it appears in the file.

### Step 4: Deploy

After setting the environment variable:
1. Trigger a new deployment in Render
2. Check the logs to verify authentication is successful
3. You should see: "Private key loaded from environment variable successfully" and "Authentication successful"

### Troubleshooting

If you see authentication errors:

1. **"Error parsing private key from environment variable"**: 
   - Make sure the JSON is valid
   - Check that all quotes and brackets are properly formatted
   - Try copying the JSON again

2. **"Authentication failed"**:
   - Verify your service account has Earth Engine access
   - Make sure the service account is registered at https://signup.earthengine.google.com/#!/service_accounts
   - Check that the Earth Engine API is enabled in your Google Cloud project

3. **"Earth Engine not authenticated"**:
   - Check the server logs for initialization errors
   - Restart the service after setting the environment variable

### Local Development

For local development, you can still use the `privatekey.json` file in the root directory. The application will automatically detect and use it when the environment variable is not set.