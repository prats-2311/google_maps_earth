# Wind Visualization Implementation

## Overview
This document describes the implementation of the combined temperature and wind visualization feature as specified in `feature_new.md`. The implementation allows users to visualize wind streamlines on top of the temperature heatmap, providing a more comprehensive view of climate data for Uttar Pradesh.

## Implementation Details

### Backend Implementation
The backend endpoint `/ee-weather-layer` was already fully implemented in `server.js`. This endpoint:

1. Accepts a `year` parameter from the request
2. Fetches both temperature and wind data from Google Earth Engine for that year
3. Returns a combined JSON response containing:
   - Temperature data with mapid and token for tile rendering
   - Wind data with U/V components and metadata

The endpoint uses the ERA5 dataset from Google Earth Engine, selecting both temperature and wind components:
- `mean_2m_air_temperature` for temperature data
- `u_component_of_wind_10m` and `v_component_of_wind_10m` for wind data

### Frontend Implementation

#### 1. Added Wind Visualization Libraries
Added the necessary libraries to `index.html`:
```html
<!-- Load wind-gl library for wind visualization -->
<script src="https://unpkg.com/mapbox-gl@2.0.0/dist/mapbox-gl.js"></script>
<script src="https://unpkg.com/webgl-wind@0.1.0/dist/webgl-wind.min.js"></script>
```

#### 2. Updated Wind Layer Visualization
Enhanced the `loadWindLayer` function in `app.js` to use the webgl-wind library for proper streamline visualization:

```javascript
// Load wind layer using webgl-wind library
function loadWindLayer(windData) {
  // Create wind canvas overlay with transparent background
  const windCanvas = document.createElement('canvas');
  
  // Initialize the wind visualization with WebGLWind
  const wind = new WebGLWind(windCanvas);
  
  // Configure animation parameters
  wind.setOptions({
    numParticles: 5000,
    fadeOpacity: 0.996,
    speedFactor: 0.25,
    // Additional settings...
  });
  
  // Set the wind data from the API response
  wind.setWind({
    width: width,
    height: height,
    uMin: windData.uMin,
    uMax: windData.uMax,
    vMin: windData.vMin,
    vMax: windData.vMax,
    data: [uData, vData]
  });
  
  // Start the animation loop
  function frame() {
    wind.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

#### 3. Fallback Mechanism
Added a fallback to the simple arrow visualization if WebGL initialization fails:

```javascript
try {
  // WebGL wind initialization
} catch (error) {
  // Fallback to simple arrow visualization
  const ctx = windCanvas.getContext('2d');
  // Draw arrows...
}
```

## Usage
To use the combined temperature and wind visualization:

1. Select "Temperature + Wind" from the visualization mode selector
2. Use the year slider to select a year between 1979-2020
3. The application will fetch both temperature and wind data for that year
4. The temperature heatmap will be displayed as the base layer
5. Animated wind streamlines will be displayed on top, showing wind direction and intensity

## Technical Notes

### Data Structure
The wind data from the API has the following structure:
```javascript
{
  width: 300,          // Width of the wind grid
  height: 200,         // Height of the wind grid
  uData: [...],        // U component values (east-west)
  vData: [...],        // V component values (north-south)
  uMin: -10,           // Minimum U value
  uMax: 10,            // Maximum U value
  vMin: -10,           // Minimum V value
  vMax: 10             // Maximum V value
}
```

### Animation Performance
The wind streamline animation uses WebGL for hardware-accelerated rendering, providing smooth performance even with thousands of particles. The animation parameters can be adjusted to balance visual quality and performance:

- `numParticles`: Controls the number of animated particles
- `fadeOpacity`: Controls how quickly particle trails fade
- `speedFactor`: Controls how fast particles move

### Browser Compatibility
The WebGL-based wind visualization requires a browser with WebGL support. For browsers without WebGL support, the implementation falls back to a simpler Canvas-based arrow visualization.

## Future Enhancements
Potential future enhancements to the wind visualization:

1. Add color coding to wind particles based on speed
2. Allow users to adjust visualization parameters (particle density, speed)
3. Add wind speed legend alongside the temperature legend
4. Implement vector field interpolation for smoother visualization
5. Add the ability to toggle between streamlines and arrow visualization