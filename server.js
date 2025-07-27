const express = require('express');
const ee = require('@google/earthengine');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for favicon to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No content response
});

// Route for the test page
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

/*
 * GOOGLE EARTH ENGINE AUTHENTICATION INSTRUCTIONS
 * 
 * To authenticate with Google Earth Engine, follow these steps:
 * 
 * 1. Create a Google Cloud Project at https://console.cloud.google.com/
 * 2. Enable the Earth Engine API for your project
 * 3. Create a service account with the "Earth Engine Resource Admin" role
 * 4. Generate a JSON key file for this service account
 * 5. Save the key file as 'privatekey.json' in the root directory of this project
 * 6. Register your service account for Earth Engine access at https://signup.earthengine.google.com/#!/service_accounts
 */

// Initialize Earth Engine with the private key
function initializeEarthEngine() {
  try {
    const privateKey = require('./privatekey.json');
    console.log('Private key loaded successfully');
    
    ee.data.authenticateViaPrivateKey(privateKey, () => {
      console.log('Authentication successful');
      ee.initialize(null, null, () => {
        console.log('Earth Engine client library initialized');
      }, (err) => {
        console.error('Earth Engine client library failed to initialize', err);
      });
    }, (err) => {
      console.error('Authentication failed', err);
    });
  } catch (error) {
    console.error('Error loading private key:', error);
  }
}

// Test endpoint to verify Earth Engine connection
app.get('/test-ee', (req, res) => {
  try {
    console.log('Test-EE endpoint called');
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).send({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }
    
    const message = ee.String('Hello from Earth Engine!');
    message.getInfo((data, error) => {
      if (error) {
        console.error('Error getting info from Earth Engine:', error);
        return res.status(500).send({ success: false, error: error.message });
      }
      console.log('Successfully retrieved message from Earth Engine:', data);
      res.send({ success: true, message: data });
    });
  } catch (error) {
    console.error('Exception in test-ee endpoint:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Simple in-memory cache for Earth Engine results
const tileCache = {};

// Endpoint for Earth Engine time-lapse layer
app.get('/ee-timelapse-layer', (req, res) => {
  try {
    console.log('EE-timelapse-layer endpoint called');
    const year = parseInt(req.query.year) || 2020;
    console.log(`Generating timelapse for year: ${year}`);
    
    // Check cache first
    if (tileCache[year]) {
      console.log(`Returning cached result for year ${year}`);
      return res.send(tileCache[year]);
    }
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).send({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }
    
    // Load the ERA5 dataset for the specified year
    console.log(`Loading ERA5 dataset for year ${year}...`);
    
    // Check if the year is within the expected available range
    if (year < 1979 || year > 2020) {
      console.log(`Year ${year} is outside the typical ERA5 data range (1979-2020), falling back to simulated data`);
      return res.send({
        success: true,
        mapid: 'simulated-map-id',
        token: 'simulated-token',
        year: year,
        simulated: true,
        fallback_reason: `ERA5 data not available for ${year}. Available range: 1979-2020`
      });
    }
    
    const dataset = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
      .select('mean_2m_air_temperature');
    
    // Check if the dataset contains any images
    console.log('Checking dataset size...');
    dataset.size().getInfo((size, sizeError) => {
      if (sizeError) {
        console.error('Error checking dataset size:', sizeError);
        return res.send({
          success: true,
          mapid: 'simulated-map-id',
          token: 'simulated-token',
          year: year,
          simulated: true,
          fallback_reason: `Error accessing ERA5 data for ${year}: ${sizeError.message}`
        });
      }
      
      if (size === 0) {
        console.log(`No ERA5 data found for year ${year}`);
        return res.send({
          success: true,
          mapid: 'simulated-map-id',
          token: 'simulated-token',
          year: year,
          simulated: true,
          fallback_reason: `No ERA5 data available for ${year}`
        });
      }
      
      console.log(`Found ${size} images for year ${year}`);
      
      // Load Uttar Pradesh boundaries for clipping
      console.log('Loading Uttar Pradesh boundaries...');
      const uttarPradeshROI = ee.FeatureCollection('FAO/GAUL/2015/level1')
        .filter(ee.Filter.eq('ADM1_NAME', 'Uttar Pradesh'))
        .first();
      
      // Calculate the mean temperature for the year
      console.log('Calculating mean temperature...');
      const meanTemp = dataset.mean();
      
      // Convert from Kelvin to Celsius
      const tempCelsius = meanTemp.subtract(273.15);
      
      // Clip the temperature data to Uttar Pradesh boundaries
      console.log('Clipping data to Uttar Pradesh boundaries...');
      const clippedTemp = tempCelsius.clip(uttarPradeshROI.geometry());
      
      // Define visualization parameters based on Earth Engine documentation
      // Temperature range for India: typically 15-45°C
      const visParams = {
        min: 15,
        max: 45,
        palette: [
          '000080', '0000d9', '4000ff', '8000ff', '0080ff', '00ffff', 
          '00ff80', '80ff00', 'daff00', 'ffff00', 'fff500', 'ffda00', 
          'ffb000', 'ffa400', 'ff4f00', 'ff2500', 'ff0a00', 'ff00ff'
        ]
      };
      
      console.log('Generating map ID and token...');
      
      // Generate the map ID and token using the clipped data
      clippedTemp.getMap(visParams, (result, error) => {
        if (error) {
          console.error('Error generating map:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          // Fallback to simulated data if Earth Engine fails
          console.log('Falling back to simulated data due to Earth Engine error');
          return res.send({
            success: true,
            mapid: 'simulated-map-id',
            token: 'simulated-token',
            year: year,
            simulated: true,
            fallback_reason: error.message
          });
        }
        
        console.log('Earth Engine result received:', JSON.stringify(result, null, 2));
        
        if (!result || !result.mapid) {
          console.error('Invalid map result - missing mapid');
          console.error('Result object:', JSON.stringify(result, null, 2));
          
          // Fallback to simulated data if result is invalid
          console.log('Falling back to simulated data due to invalid result');
          return res.send({
            success: true,
            mapid: 'simulated-map-id',
            token: 'simulated-token',
            year: year,
            simulated: true,
            fallback_reason: 'Invalid map data received from Earth Engine'
          });
        }
        
        console.log(`Successfully generated map ID: ${result.mapid}`);
        
        // Handle both old and new Earth Engine API response formats
        const response = { 
          success: true, 
          mapid: result.mapid, 
          token: result.token || '', // Token might be empty in newer API
          year: year,
          simulated: false
        };
        
        // Include urlFormat if available (newer API)
        if (result.urlFormat) {
          response.urlFormat = result.urlFormat;
        }
        
        // Cache the successful result
        tileCache[year] = response;
        console.log(`Cached result for year ${year}`);
        
        res.send(response);
      });
    });
  } catch (error) {
    console.error('Exception in ee-timelapse-layer endpoint:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Debug route
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug.html'));
});

// Spinner test route
app.get('/spinner-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'spinner-test.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available endpoints:`);
  console.log(`  - Main app: http://localhost:${port}/`);
  console.log(`  - Test page: http://localhost:${port}/test`);
  console.log(`  - Debug page: http://localhost:${port}/debug`);
  console.log(`  - Spinner test: http://localhost:${port}/spinner-test`);
  console.log(`  - Earth Engine test: http://localhost:${port}/test-ee`);
  initializeEarthEngine();
});