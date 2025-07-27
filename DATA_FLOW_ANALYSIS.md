# Data Flow Analysis: Google Earth Engine to TensorFlow.js Integration

## Overview
This document analyzes the data structure and flow in the climate visualization application, from Google Earth Engine through the backend to the frontend, and finally to TensorFlow.js for machine learning predictions.

## Data Flow Architecture

```
Google Earth Engine → Node.js Backend → Frontend JavaScript → TensorFlow.js
                                    ↓
                              Google Maps Display
```

## 1. Google Earth Engine Data Structure

### Backend Response Format (server.js)
The `/ee-timelapse-layer` endpoint returns the following structure:

```javascript
// Successful Earth Engine Response
{
  success: true,
  mapid: "projects/earthengine-legacy/maps/34f96c6ef44bef63b91d346fc2e9f7a0-81167b504c34a3dd48720dfb2f2ce348",
  token: "",  // Empty in newer API versions
  year: 2000,
  simulated: false,
  urlFormat: "https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/{mapid}/tiles/{z}/{x}/{y}"
}

// Fallback/Simulated Response
{
  success: true,
  mapid: "simulated-map-id",
  token: "simulated-token",
  year: 2000,
  simulated: true,
  fallback_reason: "ERA5 data not available for 2000. Available range: 1979-2020"
}
```

### Earth Engine Dataset Details
- **Dataset**: `ECMWF/ERA5/DAILY`
- **Parameter**: `mean_2m_air_temperature`
- **Units**: Kelvin (converted to Celsius: `temperature - 273.15`)
- **Spatial Resolution**: ~25km
- **Temporal Coverage**: 1979-2020
- **Region**: Filtered for Uttar Pradesh, India

### Visualization Parameters
```javascript
const visParams = {
  min: 15,    // Minimum temperature (°C)
  max: 45,    // Maximum temperature (°C)
  palette: [
    '000080', '0000d9', '4000ff', '8000ff', '0080ff', '00ffff', 
    '00ff80', '80ff00', 'daff00', 'ffff00', 'fff500', 'ffda00', 
    'ffb000', 'ffa400', 'ff4f00', 'ff2500', 'ff0a00', 'ff00ff'
  ]
};
```

## 2. Frontend Data Storage

### Earth Engine Data Storage (app.js)
```javascript
// Global storage for Earth Engine responses
let earthEngineData = {};

// Example stored data
earthEngineData[2000] = {
  success: true,
  mapid: "projects/earthengine-legacy/maps/...",
  token: "",
  year: 2000,
  simulated: false,
  urlFormat: "https://earthengine.googleapis.com/v1/..."
};
```

### Historical Temperature Data (data.js)
```javascript
// Training data for TensorFlow.js
const historicalTemperatureData = [
  { year: 1979, avgTemp: 25.0 },
  { year: 1980, avgTemp: 25.1 },
  // ... more data points
  { year: 2023, avgTemp: 28.5 }
];
```

## 3. Google Maps Integration

### Tile Layer Creation
```javascript
// New Earth Engine API (preferred)
const getTileUrlFunction = function(tile, zoom) {
  return data.urlFormat
    .replace('{z}', zoom)
    .replace('{x}', tile.x)
    .replace('{y}', tile.y);
};

// Legacy API (fallback)
const getTileUrlFunction = function(tile, zoom) {
  return `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}?token=${data.token}`;
};
```

### Map Layer Properties
```javascript
const tileSource = new google.maps.ImageMapType({
  name: `Temperature ${year}`,
  getTileUrl: getTileUrlFunction,
  tileSize: new google.maps.Size(256, 256),
  minZoom: 1,
  maxZoom: 20
});
```

## 4. TensorFlow.js Integration

### Data Preprocessing
```javascript
// Extract features and labels
const years = historicalTemperatureData.map(d => d.year);
const temps = historicalTemperatureData.map(d => d.avgTemp);

// Normalization
const yearMin = Math.min(...years);
const yearMax = Math.max(...years);
const normalizedYears = years.map(y => (y - yearMin) / (yearMax - yearMin));

const tempMin = Math.min(...temps);
const tempMax = Math.max(...temps);
const normalizedTemps = temps.map(t => (t - tempMin) / (tempMax - tempMin));
```

### Model Architecture
```javascript
const model = tf.sequential();
model.add(tf.layers.dense({ 
  units: 10, 
  inputShape: [1], 
  activation: 'relu' 
}));
model.add(tf.layers.dense({ units: 1 }));
model.compile({ 
  optimizer: 'adam', 
  loss: 'meanSquaredError' 
});
```

### Tensor Operations
```javascript
// Convert to tensors
const xs = tf.tensor2d(normalizedYears, [normalizedYears.length, 1]);
const ys = tf.tensor2d(normalizedTemps, [normalizedTemps.length, 1]);

// Training
await model.fit(xs, ys, { epochs: 100 });

// Prediction
const futureTensor = tf.tensor2d(normalizedFutureYears, [3, 1]);
const predictions = model.predict(futureTensor);
```

## 5. Data Format Comparison

| Data Source | Format | Purpose | Structure |
|-------------|--------|---------|-----------|
| Earth Engine | Raster Tiles | Spatial Visualization | `{mapid, urlFormat, year}` |
| Historical Data | Time Series | ML Training | `{year, avgTemp}[]` |
| TensorFlow | Tensors | ML Processing | `tensor2d([normalized_values])` |
| Google Maps | Image Tiles | Display | `256x256 PNG tiles` |

## 6. Current Limitations and Future Enhancements

### Current Approach
- Earth Engine data is used only for visualization
- TensorFlow training uses pre-defined historical data
- No direct integration between Earth Engine pixels and ML model

### Potential Enhancements
1. **Pixel Value Extraction**: Extract actual temperature values from Earth Engine tiles
2. **Spatial-Temporal Model**: Train on both spatial and temporal dimensions
3. **Real-time Data Integration**: Use Earth Engine's real-time capabilities
4. **Multi-parameter Models**: Include additional climate variables

### Implementation Ideas
```javascript
// Future enhancement: Extract pixel values from Earth Engine
async function extractPixelValues(mapid, coordinates) {
  // This would require additional Earth Engine API calls
  // to get actual pixel values for training
  const pixelValues = await ee.Image(mapid).sample({
    region: coordinates,
    scale: 25000
  }).getInfo();
  
  return pixelValues.features.map(f => f.properties.mean_2m_air_temperature);
}
```

## 7. Debugging and Troubleshooting

### Available Debug Functions
```javascript
// Check Earth Engine data structure
window.analyzeEarthEngineData();

// Debug spinner state
window.debugSpinnerState();

// Manual spinner control
window.hideLoadingSpinner();
window.showLoadingSpinner();
```

### Common Issues
1. **Spinner not hiding**: CSS conflicts or timing issues
2. **Earth Engine authentication**: Private key or service account issues
3. **Tile loading failures**: Network issues or invalid mapid
4. **TensorFlow errors**: Data normalization or tensor shape issues

## 8. Performance Considerations

### Earth Engine
- Tile caching by Google Maps
- Lazy loading of tiles
- Fallback to simulated data

### TensorFlow.js
- Client-side processing
- Small model size (10 neurons)
- Fast inference (~100ms)

### Memory Management
```javascript
// Always dispose tensors
xs.dispose();
ys.dispose();
predictions.dispose();
```

This analysis provides a comprehensive overview of how data flows through the system, from Earth Engine's spatial temperature data to TensorFlow's temporal predictions, all integrated through Google Maps for visualization.