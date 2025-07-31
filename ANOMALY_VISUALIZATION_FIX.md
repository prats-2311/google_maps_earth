# Temperature Anomaly Visualization Fix

## Problem
The temperature anomaly visualization mode was not showing properly on the map. Users could select the "📊 Temperature Anomaly" option but no visual overlay would appear.

## Root Cause Analysis
After investigation, I identified several issues:

1. **Inappropriate visualization range**: The original range was -3°C to +3°C, later expanded to -5°C to +5°C, but actual anomaly values are much smaller (typically ±1-2°C)
2. **Low opacity**: Using the same opacity (0.7) as temperature data made subtle anomaly differences hard to see
3. **Insufficient debugging**: Limited logging made it difficult to identify tile loading issues

## Actual Anomaly Data Ranges
Testing revealed realistic anomaly values for Uttar Pradesh:
- **2000**: -0.55°C to +0.60°C (slightly cooler than 1980-2000 baseline)
- **2010**: +0.29°C to +1.45°C (warmer than baseline)
- **2020**: -1.33°C to +0.47°C (mixed, but cooler overall)

## Fixes Applied

### 1. Backend Changes (`server.js`)

#### Optimized Visualization Range
```javascript
const anomalyVisParams = {
  min: -2,  // 2°C cooler than baseline
  max: 2,   // 2°C warmer than baseline
  palette: [
    '#000080', '#0040ff', '#0080ff', '#00c0ff', '#80e0ff', '#ffffff',
    '#ffe080', '#ffc040', '#ff8000', '#ff4000', '#ff0000', '#800000'
  ]
};
```

#### Added Statistical Logging
```javascript
clippedAnomaly.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: uttarPradeshROI.geometry(),
  scale: 1000,
  maxPixels: 1e9
}).getInfo((stats, statsError) => {
  if (!statsError && stats) {
    console.log(`Anomaly range for year ${year}:`, {
      min: stats.mean_2m_air_temperature_min,
      max: stats.mean_2m_air_temperature_max
    });
  }
});
```

#### Added Test Endpoint
New endpoint `/test-anomaly-calc` to verify anomaly calculations are working correctly.

### 2. Frontend Changes (`public/js/app.js`)

#### Increased Opacity for Anomaly Mode
```javascript
let opacity = 0.7; // default
if (currentVisualizationMode === 'weather') {
  opacity = 0.6; // lower for weather to show wind overlay
} else if (currentVisualizationMode === 'anomaly') {
  opacity = 0.9; // higher for anomaly to make subtle differences visible
} else if (currentVisualizationMode === 'terrain') {
  opacity = 0.8; // medium for terrain blend
}
```

#### Enhanced Debugging for Anomaly
```javascript
if (currentVisualizationMode === 'anomaly') {
  console.log('Anomaly layer details:', {
    mapid: data.mapid,
    token: data.token,
    urlFormat: data.urlFormat,
    dataType: data.dataType,
    units: data.units,
    opacity: opacity
  });
  
  // Force map refresh for anomaly data
  setTimeout(() => {
    console.log('Forcing map refresh for anomaly visualization...');
    google.maps.event.trigger(map, 'resize');
    map.setZoom(map.getZoom());
  }, 500);
}
```

#### Updated Legend
```javascript
case 'anomaly':
  legendContent = `
    <div style="font-weight: bold; margin-bottom: 8px;">Temperature Anomaly - ${year}</div>
    <div style="font-size: 11px; margin-bottom: 8px;">Difference from 1980-2000 baseline</div>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 200px; height: 20px; background: linear-gradient(to right, 
        #000080, #0080ff, #80e0ff, #ffffff, #ffe080, #ff8000, #800000); border: 1px solid #ccc;"></div>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>-2°C</span><span>0°C</span><span>+2°C</span>
    </div>
    <div style="font-size: 10px; color: #666; margin-top: 5px;">
      Blue = Cooler than average | Red = Warmer than average
    </div>
  `;
```

## Testing Instructions

### 1. Start the Server
```bash
cd /Users/prateeksrivastava/Documents/google_maps_earth
node server.js
```

### 2. Test Backend Anomaly Calculation
```bash
# Test different years to see anomaly ranges
curl "http://localhost:3000/test-anomaly-calc?year=2000"
curl "http://localhost:3000/test-anomaly-calc?year=2010" 
curl "http://localhost:3000/test-anomaly-calc?year=2020"
```

### 3. Test Anomaly Visualization
1. Open `http://localhost:3000` in your browser
2. Wait for the map to load
3. In the visualization controls (top-right), select "📊 Temperature Anomaly"
4. Use the year slider to test different years (try 2000, 2010, 2020)
5. Check browser console for debugging logs

### 4. Debug Page
Visit `http://localhost:3000/debug-anomaly` for detailed anomaly testing tools.

## Expected Results

### Visual Appearance
- **Blue areas**: Regions cooler than the 1980-2000 baseline
- **White areas**: Regions close to the baseline temperature
- **Red areas**: Regions warmer than the baseline
- **High opacity (0.9)**: Anomaly patterns should be clearly visible

### Console Logs
You should see logs like:
```
Using urlFormat for anomaly: https://earthengine.googleapis.com/v1/projects/...
Anomaly layer details: { mapid: "...", opacity: 0.9, ... }
Forcing map refresh for anomaly visualization...
```

### Different Years Should Show Different Patterns
- **2000**: Mostly blue (cooler than baseline)
- **2010**: More red/orange (warmer than baseline)  
- **2020**: Mixed blue and white (variable)

## Troubleshooting

### If Anomaly Still Not Visible
1. Check browser console for tile loading errors
2. Verify Earth Engine authentication is working
3. Test with the debug page at `/debug-anomaly`
4. Try different years - some may have more pronounced anomalies

### If Backend Errors
1. Ensure `privatekey.json` exists and is valid
2. Check Earth Engine service account permissions
3. Verify internet connection for Earth Engine API calls

## Technical Notes

### Anomaly Calculation
- **Baseline**: 1980-2000 average temperature (20-year period for stability)
- **Calculation**: `anomaly = yearTemp - baseline`
- **Units**: Degrees Celsius difference from baseline
- **Range**: Typically ±2°C, with most values within ±1°C

### Color Palette
The diverging color palette uses:
- **Blue tones**: Negative anomalies (cooler)
- **White**: Near-zero anomalies (close to baseline)
- **Red tones**: Positive anomalies (warmer)

This fix should resolve the anomaly visualization issue and make temperature anomalies clearly visible on the map.