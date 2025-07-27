# Troubleshooting Guide

## Common Issues and Solutions

### 1. Port 3000 Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

#### Option A: Use the Clean Start Script
```bash
npm run start:clean
```

#### Option B: Kill Existing Process Manually
```bash
# Find the process using port 3000
lsof -ti:3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Then start normally
npm start
```

#### Option C: Use the Kill Port Script
```bash
npm run kill-port
npm start
```

#### Option D: Use the Shell Script
```bash
./start.sh
```

### 2. Google Maps Not Loading

**Symptoms:**
- Blank map area
- Console errors about Google Maps API

**Solutions:**

1. **Check API Key**: Verify the Google Maps API key is valid
2. **Check Network**: Ensure internet connection is working
3. **Check Browser Console**: Look for specific error messages
4. **Try Different Browser**: Test in Chrome, Firefox, or Safari

### 3. Earth Engine Authentication Issues

**Error Messages:**
- "Authentication failed"
- "privatekey.json not found"

**Solutions:**

1. **Check Credentials File**:
   ```bash
   ls -la privatekey.json
   ```

2. **Test Connection**:
   ```bash
   node test-connection.js
   ```

3. **Verify Service Account**: Ensure your service account is registered for Earth Engine

### 4. No Temperature Data Showing

**Symptoms:**
- Map loads but no colored overlay appears
- Slider moves but no visual changes

**Solutions:**

1. **Check Year Range**: Use years between 1979-2020
2. **Test Backend**: Visit `http://localhost:3000/test-ee`
3. **Check Network Tab**: Look for failed API requests in browser dev tools
4. **Try Different Year**: Test with year 2000 or 2010

### 5. Server Won't Start

**Common Causes:**

#### Missing Dependencies
```bash
npm install
```

#### Node.js Version Issues
```bash
node --version  # Should be v14 or higher
```

#### Permission Issues
```bash
chmod +x start.sh
chmod +x setup.sh
```

### 6. Performance Issues

**Symptoms:**
- Slow loading
- Unresponsive interface

**Solutions:**

1. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
2. **Check System Resources**: Close other applications
3. **Try Different Year**: Some years may have more data to process

## Quick Diagnostic Commands

### Check Server Status
```bash
curl -s http://localhost:3000/test-ee
```

### Check Port Usage
```bash
lsof -i:3000
```

### Test Earth Engine Connection
```bash
node test-connection.js
```

### View Server Logs
```bash
tail -f server.log
```

## Environment-Specific Issues

### macOS
- **Permission Issues**: Use `sudo` if needed for port binding
- **Firewall**: Check if firewall is blocking connections

### Windows
- **Path Issues**: Use forward slashes in paths
- **PowerShell**: May need different commands for port checking

### Linux
- **Port Permissions**: Ports below 1024 may require sudo
- **Process Management**: Use `ps aux | grep node` to find processes

## Getting Help

### Debug Information to Collect

1. **System Info**:
   ```bash
   node --version
   npm --version
   uname -a  # macOS/Linux
   ```

2. **Server Logs**:
   ```bash
   cat server.log
   ```

3. **Browser Console**: Copy any error messages

4. **Network Tab**: Check for failed requests

### Test Endpoints

- **Main App**: `http://localhost:3000/`
- **Test Page**: `http://localhost:3000/test`
- **Earth Engine Test**: `http://localhost:3000/test-ee`
- **Sample Data**: `http://localhost:3000/ee-timelapse-layer?year=2000`

## Prevention Tips

1. **Always Use Clean Start**: `npm run start:clean` instead of `npm start`
2. **Check Logs Regularly**: Monitor `server.log` for issues
3. **Test After Changes**: Use test endpoints to verify functionality
4. **Keep Dependencies Updated**: Run `npm update` periodically

## Emergency Reset

If everything fails, try this complete reset:

```bash
# Kill all node processes
pkill -f node

# Clean install
rm -rf node_modules package-lock.json
npm install

# Start fresh
npm run start:clean
```

This should resolve most common issues with the climate visualization application.