# Wind Visualization Fix

## Issue Description
When clicking on the visualization mode for temperature + wind, the application was showing the following error:
```
Error initializing wind visualization: ReferenceError: WebGLWind is not defined
    at loadWindLayer (app.js:1457:18)
    at app.js:1346:13
```

## Root Cause Analysis
The issue was caused by two problems:

1. The script URL for the wind visualization library in index.html was pointing to a non-existent resource:
   ```html
   <script src="https://unpkg.com/webgl-wind@0.1.0/dist/webgl-wind.min.js"></script>
   ```
   This URL returned a 404 error, meaning the library was not being loaded.

2. The app.js file was trying to use a class called `WebGLWind`, but the actual library exports a class called `WindGL`.

## Changes Made

### 1. Updated the script URL in index.html
Changed the script tag from:
```html
<script src="https://unpkg.com/webgl-wind@0.1.0/dist/webgl-wind.min.js"></script>
```
to:
```html
<script src="https://cdn.jsdelivr.net/gh/mapbox/webgl-wind@master/dist/wind-gl.js"></script>
```

This URL points to the correct library file on jsDelivr, which serves files directly from GitHub repositories.

### 2. Updated the class name in app.js
Changed the class instantiation from:
```javascript
const wind = new WebGLWind(windCanvas);
```
to:
```javascript
const wind = new WindGL(windCanvas);
```

This ensures that the application uses the correct class name that is exported by the wind-gl.js library.

## Verification
After making these changes, the temperature + wind visualization mode should work correctly. The application will now be able to load the wind visualization library and instantiate the WindGL class to render the wind visualization on the canvas.

## Additional Notes
- The webgl-wind library is maintained by Mapbox and is available on GitHub at: https://github.com/mapbox/webgl-wind
- The library provides a WebGL-based wind particle animation that visualizes wind patterns on a map
- The application has a fallback mechanism that will display simple wind arrows if the WebGL initialization fails