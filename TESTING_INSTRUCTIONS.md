# Testing Instructions for Wind Visualization

## Overview
This document provides instructions for testing the combined temperature and wind visualization feature implemented according to the requirements in `feature_new.md`.

## Prerequisites
- Node.js installed
- Google Earth Engine authentication set up (privatekey.json in project root)
- Google Maps API key configured

## Testing Steps

### 1. Start the Server
```bash
# Start the server
node server.js

# Or use the provided start script
./start.sh
```

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Test the Backend API Endpoint
You can directly test the backend endpoint by accessing:
```
http://localhost:3000/ee-weather-layer?year=2000
```

This should return a JSON response containing both temperature and wind data:
```json
{
  "success": true,
  "year": 2000,
  "temperature": {
    "mapid": "...",
    "token": "...",
    "urlFormat": "..."
  },
  "wind": {
    "width": 300,
    "height": 200,
    "uData": [...],
    "vData": [...],
    "uMin": -10,
    "uMax": 10,
    "vMin": -10,
    "vMax": 10
  }
}
```

### 4. Test the Frontend Visualization

1. **Select Visualization Mode**:
   - Look for the visualization mode selector in the top-right corner of the map
   - Select "Temperature + Wind" option

2. **Select a Year**:
   - Use the year slider to select different years (e.g., 2000, 2010, 2020)
   - Verify that the data loads for each year

3. **Verify Temperature Layer**:
   - Confirm that the temperature heatmap is displayed as the base layer
   - Check that the temperature legend is visible and accurate

4. **Verify Wind Layer**:
   - Confirm that wind streamlines are animated on top of the temperature layer
   - Verify that the streamlines move in a direction consistent with the wind data
   - Check that the wind layer has a transparent background so the temperature heatmap is visible underneath

5. **Test Different Years**:
   - Move the slider through different years
   - Verify that both temperature and wind data update correctly

### 5. Test Browser Compatibility

Test the visualization in different browsers to ensure compatibility:
- Chrome (should work with full WebGL support)
- Firefox (should work with full WebGL support)
- Safari (may have limited WebGL support)
- Edge (should work with full WebGL support)

If WebGL is not supported, verify that the fallback arrow visualization appears.

### 6. Test Error Handling

1. **Test with Invalid Year**:
   - Try accessing `/ee-weather-layer?year=2030` (outside valid range)
   - Verify that an appropriate error message is returned

2. **Test with Missing Year**:
   - Try accessing `/ee-weather-layer` without a year parameter
   - Verify that an appropriate error message is returned

3. **Test with Network Issues**:
   - Temporarily disable network connection
   - Verify that the application shows an appropriate error message

### 7. Performance Testing

1. **Animation Performance**:
   - Observe the smoothness of the wind streamline animation
   - Check CPU/GPU usage to ensure efficient rendering

2. **Loading Time**:
   - Measure the time it takes to load the combined visualization
   - Compare with the time to load just the temperature layer

## Expected Results

### Visual Appearance
- Temperature heatmap should be visible as the base layer
- Animated wind streamlines should flow on top of the temperature layer
- Wind streamlines should be semi-transparent white lines
- The direction of streamlines should correspond to wind direction
- The background of the wind layer should be transparent

### Performance
- Animation should run smoothly at 60fps on modern browsers
- Loading time should be reasonable (within a few seconds)
- CPU/GPU usage should not be excessive

### Error Handling
- Invalid inputs should produce appropriate error messages
- Network issues should be handled gracefully
- The application should not crash under any circumstances

## Troubleshooting

### Common Issues

1. **Wind Layer Not Appearing**:
   - Check browser console for JavaScript errors
   - Verify that the webgl-wind library is loaded correctly
   - Check if WebGL is supported in your browser

2. **Slow Performance**:
   - Reduce the number of particles in the wind visualization
   - Check for other resource-intensive processes running on your computer

3. **Backend Errors**:
   - Verify Earth Engine authentication is set up correctly
   - Check server logs for any API errors
   - Ensure the year parameter is within the valid range (1979-2020)

### Debug Mode

You can enable debug mode by adding `?debug=true` to the URL:
```
http://localhost:3000?debug=true
```

This will:
- Bypass caching
- Show additional console logs
- Provide more detailed error messages

## Conclusion

After completing these tests, you should have verified that:
1. The backend endpoint `/ee-weather-layer` correctly provides both temperature and wind data
2. The frontend properly visualizes both data layers together
3. The wind streamlines are animated using the webgl-wind library
4. The visualization is responsive, performant, and handles errors gracefully