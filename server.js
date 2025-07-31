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

// Route for the global locations test page
app.get('/test-global', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-global-locations.html'));
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

// Add a function to clear cache for debugging
function clearCache() {
  Object.keys(tileCache).forEach(key => delete tileCache[key]);
  console.log('Cache cleared');
}

// Debug endpoint to clear cache
app.get('/clear-cache', (req, res) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

// Helper function to get location Region of Interest (ROI)
async function getLocationROI(locationName, lat, lng, bounds) {
  try {
    // If coordinates are provided, create a bounding box ROI
    if (lat && lng && bounds) {
      console.log(`Creating ROI from coordinates: ${lat}, ${lng}`);
      const geometry = ee.Geometry.Rectangle([
        bounds.west, bounds.south, bounds.east, bounds.north
      ]);
      return ee.Feature(geometry);
    }

    // Try to find administrative boundary by name
    console.log(`Searching for administrative boundary: ${locationName}`);

    // Try different administrative levels
    const adminLevels = [
      { collection: 'FAO/GAUL/2015/level0', field: 'ADM0_NAME' }, // Country
      { collection: 'FAO/GAUL/2015/level1', field: 'ADM1_NAME' }, // State/Province
      { collection: 'FAO/GAUL/2015/level2', field: 'ADM2_NAME' }  // District/County
    ];

    for (const level of adminLevels) {
      try {
        const collection = ee.FeatureCollection(level.collection);
        const filtered = collection.filter(ee.Filter.eq(level.field, locationName));

        // Check if any features match
        const size = await new Promise((resolve, reject) => {
          filtered.size().getInfo((result, error) => {
            if (error) reject(error);
            else resolve(result);
          });
        });

        if (size > 0) {
          console.log(`Found ${locationName} in ${level.collection}`);
          return filtered.first();
        }
      } catch (error) {
        console.log(`No match in ${level.collection}: ${error.message}`);
      }
    }

    // If no administrative boundary found, create a point-based ROI
    if (lat && lng) {
      console.log(`Creating point-based ROI for coordinates: ${lat}, ${lng}`);
      const point = ee.Geometry.Point([lng, lat]);
      const buffer = point.buffer(50000); // 50km radius
      return ee.Feature(buffer);
    }

    // If no administrative boundary found and no coordinates provided, return error
    throw new Error(`Unable to find location: ${locationName}. Please try using coordinates or a more specific location name.`);

  } catch (error) {
    console.error('Error in getLocationROI:', error);
    throw error; // Propagate the error instead of falling back
  }
}

// Helper function to get climate-appropriate temperature ranges
function getTemperatureRange(locationName, lat) {
  // Default ranges
  let tempRange = { min: 10, max: 50 };

  // Adjust based on latitude (climate zones)
  if (lat) {
    const absLat = Math.abs(lat);

    if (absLat > 60) {
      // Arctic/Antarctic
      tempRange = { min: -30, max: 20 };
    } else if (absLat > 45) {
      // Temperate/Subarctic
      tempRange = { min: -20, max: 35 };
    } else if (absLat > 23.5) {
      // Temperate
      tempRange = { min: -10, max: 45 };
    } else {
      // Tropical/Subtropical
      tempRange = { min: 10, max: 50 };
    }
  }

  // Location-specific adjustments
  const locationLower = locationName.toLowerCase();
  if (locationLower.includes('alaska') || locationLower.includes('siberia') || locationLower.includes('greenland')) {
    tempRange = { min: -40, max: 25 };
  } else if (locationLower.includes('sahara') || locationLower.includes('desert')) {
    tempRange = { min: 0, max: 60 };
  } else if (locationLower.includes('antarctica')) {
    tempRange = { min: -60, max: 10 };
  }

  console.log(`Temperature range for ${locationName} (lat: ${lat}):`, tempRange);
  return tempRange;
}

// Endpoint for Earth Engine time-lapse layer
app.get('/ee-timelapse-layer', async (req, res) => {
  try {
    console.log('EE-timelapse-layer endpoint called');
    const year = parseInt(req.query.year) || 2020;
    const bypassCache = req.query.nocache === 'true';

    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }

    console.log(`Generating timelapse for year: ${year}, location: ${locationName}, bypass cache: ${bypassCache}`);

    // Create location-specific cache key
    const cacheKey = `${year}_${locationName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Check cache first (unless bypassed)
    if (!bypassCache && tileCache[cacheKey]) {
      console.log(`Returning cached result for year ${year}, location: ${locationName}`);
      console.log(`Cached data for ${cacheKey}:`, {
        mapid: tileCache[cacheKey].mapid,
        year: tileCache[cacheKey].year,
        location: tileCache[cacheKey].location,
        simulated: tileCache[cacheKey].simulated
      });
      return res.send(tileCache[cacheKey]);
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
    console.log(`Date filter: ${year}-01-01 to ${year}-12-31`);
    
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
    
    console.log(`Creating filtered dataset for year ${year}...`);
    
    // Create date range for the specific year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // Load the collection and apply filters step by step to ensure proper filtering
    const collection = ee.ImageCollection('ECMWF/ERA5/DAILY');
    console.log('Base collection loaded');
    
    const dateFiltered = collection.filter(ee.Filter.date(startDate, endDate));
    console.log(`Date filter applied: ${startDate} to ${endDate}`);
    
    const dataset = dateFiltered.select('mean_2m_air_temperature');
    console.log('Temperature band selected');
    
    console.log(`Dataset created with date filter: ${startDate} to ${endDate}`);
    
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
      
      // Verify the date range of the filtered dataset
      console.log('Verifying date range of filtered dataset...');
      const firstImage = dataset.first();
      const lastImage = dataset.sort('system:time_start', false).first();
      
      // Load location boundaries for clipping
      console.log(`Loading boundaries for location: ${locationName}...`);
      
      getLocationROI(locationName, lat, lng, bounds).then(locationROI => {
      
      // Calculate the mean temperature for the year (CRITICAL: this must be done on the filtered dataset)
      console.log(`Calculating mean temperature for year ${year} from ${size} images...`);
      const meanTemp = dataset.mean();
      console.log(`Mean temperature calculated for year ${year}`);
      
      // Convert from Kelvin to Celsius
      const tempCelsius = meanTemp.subtract(273.15);
      
      // Add a unique identifier to ensure each year's computation is distinct
      const uniqueId = `temp_${year}_${Date.now()}`;
      const tempWithId = tempCelsius.set('computation_id', uniqueId);
      console.log(`Added unique computation ID: ${uniqueId}`);
      
      // Clip the temperature data to location boundaries
      console.log(`Clipping data to ${locationName} boundaries...`);
      const clippedTemp = tempWithId.clip(locationROI.geometry());

      // Get climate-appropriate temperature range
      const tempRange = getTemperatureRange(locationName, lat);

      // Define visualization parameters based on location's climate
      const visParams = {
        min: tempRange.min,
        max: tempRange.max,
        palette: [
          // Cold - Blues and purples
          '000080', '0040ff', '0080ff', '00c0ff', '80e0ff',
          // Cool - Light blues to cyan
          '00ffff', '80ffff', 'c0ffff',
          // Mild - Greens
          '00ff80', '40ff40', '80ff00', 'c0ff00',
          // Warm - Yellows
          'ffff00', 'ffd000', 'ffa000',
          // Hot - Oranges
          'ff8000', 'ff6000', 'ff4000',
          // Very Hot - Reds
          'ff2000', 'ff0000', 'e00000',
          // Extreme - Dark reds
          'c00000', 'a00000', '800000'
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
        console.log(`Cached result for year ${year}:`, {
          mapid: response.mapid,
          year: response.year,
          simulated: response.simulated
        });
        
        res.send(response);
      });
      
      }).catch(locationError => {
        console.error('Error getting location ROI:', locationError);
        return res.status(500).send({
          success: false,
          error: `Failed to load location data: ${locationError.message}`
        });
      });
    });
  } catch (error) {
    console.error('Exception in ee-timelapse-layer endpoint:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// Dedicated temperature layer endpoint for time-lapse feature
app.get('/ee-temp-layer', async (req, res) => {
  try {
    console.log('EE-temp-layer endpoint called');
    const year = parseInt(req.query.year) || 2000;
    const bypassCache = req.query.nocache === 'true';
    
    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }
    
    console.log(`Generating temperature layer for year: ${year}, location: ${locationName}, bypass cache: ${bypassCache}`);
    
    // Create location-specific cache key  
    const cacheKey = `temp_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
    if (!bypassCache && tileCache[cacheKey]) {
      console.log(`Returning cached temperature result for year ${year}, location: ${locationName}`);
      console.log(`Cached temperature data for year ${year}:`, {
        mapid: tileCache[cacheKey].mapid,
        year: tileCache[cacheKey].year,
        dataType: tileCache[cacheKey].dataType
      });
      return res.send(tileCache[cacheKey]);
    }
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).send({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }
    
    // Validate year range for ERA5 data
    if (year < 1979 || year > 2020) {
      console.log(`Year ${year} is outside ERA5 data range (1979-2020)`);
      return res.status(400).send({
        success: false,
        error: `Year ${year} is outside available data range. ERA5 data available: 1979-2020`
      });
    }
    
    console.log(`Loading boundaries for location: ${locationName}...`);
    // Load location boundaries using the dynamic location function
    const locationROI = await getLocationROI(locationName, lat, lng, bounds);
    
    console.log(`Loading ERA5 temperature data for year ${year}...`);
    console.log(`Temperature date filter: ${year}-01-01 to ${year}-12-31`);
    
    // Step 3: Load ERA5 Daily Aggregates for the requested year
    console.log(`Creating filtered temperature collection for year ${year}...`);
    
    // Create date range for the specific year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // Load the collection and apply filters step by step to ensure proper filtering
    const baseCollection = ee.ImageCollection('ECMWF/ERA5/DAILY');
    console.log('Base temperature collection loaded');
    
    const dateFilteredCollection = baseCollection.filter(ee.Filter.date(startDate, endDate));
    console.log(`Temperature date filter applied: ${startDate} to ${endDate}`);
    
    const temperatureCollection = dateFilteredCollection.select('mean_2m_air_temperature');
    console.log('Temperature band selected from filtered collection');
    
    console.log(`Temperature collection created with date filter: ${startDate} to ${endDate}`);
    
    // Check if data exists for this year
    temperatureCollection.size().getInfo((size, sizeError) => {
      if (sizeError) {
        console.error('Error checking dataset size:', sizeError);
        return res.status(500).send({
          success: false,
          error: `Error accessing ERA5 data: ${sizeError.message}`
        });
      }
      
      if (size === 0) {
        console.log(`No ERA5 data found for year ${year}`);
        return res.status(404).send({
          success: false,
          error: `No temperature data available for year ${year}`
        });
      }
      
      console.log(`Found ${size} temperature images for year ${year}`);
      
      // Verify the date range of the filtered temperature collection
      console.log('Verifying date range of filtered temperature collection...');
      const firstTempImage = temperatureCollection.first();
      const lastTempImage = temperatureCollection.sort('system:time_start', false).first();
      
      // Calculate min and max temperatures instead of mean
      console.log(`Calculating min and max temperatures for year ${year} from ${size} images...`);

      // Get the collection for the year
      const yearlyCollection = temperatureCollection;

      // Calculate min temperature for the year
      const minTemp = yearlyCollection.min().subtract(273.15);
      const maxTemp = yearlyCollection.max().subtract(273.15);

      // Create a composite showing temperature range
      const tempRange = maxTemp.subtract(minTemp);

      // Use max temperature for the main visualization (shows hotspots)
      const tempForVisualization = maxTemp;

      // Add unique identifier
      const uniqueTempId = `temp_minmax_${year}_${Date.now()}`;
      const tempWithId = tempForVisualization.set('computation_id', uniqueTempId);

      // Clip to location boundaries
      console.log(`Clipping temperature data to ${locationName} boundaries...`);
      const clippedTemp = tempWithId.clip(locationROI.geometry());

      // Enhanced visualization parameters for min/max temperature display
      const tempVisParams = {
        min: 5,     // Lower bound for cold spots
        max: 50,    // Higher bound for hot spots  
        palette: [
          '000080', '0000d9', '4000ff', '8000ff', '0080ff', '00ffff', 
          '00ff80', '80ff00', 'daff00', 'ffff00', 'fff500', 'ffda00', 
          'ffb000', 'ffa400', 'ff4f00', 'ff2500', 'ff0a00', 'ff00ff'
        ]
      };

      // Get statistics for the clipped data to show actual min/max locations
      clippedTemp.reduceRegion({
        reducer: ee.Reducer.minMax(),
        geometry: locationROI.geometry(),
        scale: 1000,
        maxPixels: 1e9
      }).getInfo((stats, statsError) => {
        if (!statsError && stats) {
          console.log(`Temperature extremes for year ${year}:`, {
            min: stats.mean_2m_air_temperature_min,
            max: stats.mean_2m_air_temperature_max
          });
        }
      });

      console.log('Generating map tiles...');
      // Step 7: Generate map ID and token
      clippedTemp.getMap(tempVisParams, (result, error) => {
        if (error) {
          console.error('Error generating temperature map:', error);
          return res.status(500).send({
            success: false,
            error: `Failed to generate temperature map: ${error.message}`
          });
        }
        
        if (!result || !result.mapid) {
          console.error('Invalid map result - missing mapid');
          return res.status(500).send({
            success: false,
            error: 'Invalid map data received from Earth Engine'
          });
        }
        
        console.log(`Successfully generated temperature map ID: ${result.mapid}`);
        
        // Step 8: Prepare response with mapId and token
        const response = { 
          success: true, 
          mapid: result.mapid, 
          token: result.token || '',
          year: year,
          dataType: 'temperature',
          units: 'Celsius',
          source: 'ERA5 Daily Aggregates',
          region: locationName || `${lat}, ${lng}`
        };
        
        // Include urlFormat if available (newer API)
        if (result.urlFormat) {
          response.urlFormat = result.urlFormat;
        }
        
        // Cache the successful result
        tileCache[cacheKey] = response;
        console.log(`Cached temperature result for year ${year}:`, {
          mapid: response.mapid,
          year: response.year,
          dataType: response.dataType
        });
        
        res.send(response);
      });
    });
  } catch (error) {
    console.error('Exception in ee-temp-layer endpoint:', error);
    res.status(500).send({ 
      success: false, 
      error: error.message 
    });
  }
});

// Rainfall layer endpoint for expanding weather data visualization
app.get('/ee-rainfall-layer', async (req, res) => {
  try {
    console.log('EE-rainfall-layer endpoint called');
    const year = parseInt(req.query.year) || 2000;
    
    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }
    
    console.log(`Generating rainfall layer for year: ${year}, location: ${locationName}`);
    
    // Create location-specific cache key
    const cacheKey = `rainfall_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
    if (tileCache[cacheKey]) {
      console.log(`Returning cached rainfall result for year ${year}, location: ${locationName}`);
      return res.send(tileCache[cacheKey]);
    }
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).send({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }
    
    // Validate year range for CHIRPS data (available from 1981)
    if (year < 1981 || year > 2023) {
      console.log(`Year ${year} is outside CHIRPS data range (1981-2023)`);
      return res.status(400).send({
        success: false,
        error: `Year ${year} is outside available data range. CHIRPS data available: 1981-2023`
      });
    }
    
    console.log(`Loading boundaries for location: ${locationName}...`);
    // Load location boundaries using the dynamic location function
    const locationROI = await getLocationROI(locationName, lat, lng, bounds);
    
    console.log(`Loading CHIRPS rainfall data for year ${year}...`);
    // Load CHIRPS Daily precipitation data for the requested year
    const rainfallCollection = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
      .select('precipitation');
    
    // Check if data exists for this year
    rainfallCollection.size().getInfo((size, sizeError) => {
      if (sizeError) {
        console.error('Error checking rainfall dataset size:', sizeError);
        return res.status(500).send({
          success: false,
          error: `Error accessing CHIRPS data: ${sizeError.message}`
        });
      }
      
      if (size === 0) {
        console.log(`No CHIRPS data found for year ${year}`);
        return res.status(404).send({
          success: false,
          error: `No rainfall data available for year ${year}`
        });
      }
      
      console.log(`Found ${size} rainfall images for year ${year}`);
      
      // Calculate the total annual precipitation
      console.log('Calculating annual total precipitation...');
      const annualRainfall = rainfallCollection.sum();
      
      // Clip to location boundaries
      console.log(`Clipping rainfall data to ${locationName} boundaries...`);
      const clippedRainfall = annualRainfall.clip(locationROI.geometry());
      
      // Define visualization parameters suitable for rainfall
      const rainfallVisParams = {
        min: 0,
        max: 2000, // mm per year
        palette: ['white', 'lightblue', 'blue', 'darkblue', 'purple']
      };
      
      console.log('Generating rainfall map tiles...');
      // Generate map ID and token
      clippedRainfall.getMap(rainfallVisParams, (result, error) => {
        if (error) {
          console.error('Error generating rainfall map:', error);
          return res.status(500).send({
            success: false,
            error: `Failed to generate rainfall map: ${error.message}`
          });
        }
        
        if (!result || !result.mapid) {
          console.error('Invalid rainfall map result - missing mapid');
          return res.status(500).send({
            success: false,
            error: 'Invalid rainfall map data received from Earth Engine'
          });
        }
        
        console.log(`Successfully generated rainfall map ID: ${result.mapid}`);
        
        // Prepare response with mapId and token
        const response = { 
          success: true, 
          mapid: result.mapid, 
          token: result.token || '',
          year: year,
          dataType: 'rainfall',
          units: 'mm/year',
          source: 'CHIRPS Daily',
          region: locationName || `${lat}, ${lng}`
        };
        
        // Include urlFormat if available (newer API)
        if (result.urlFormat) {
          response.urlFormat = result.urlFormat;
        }
        
        // Cache the successful result
        tileCache[cacheKey] = response;
        console.log(`Cached rainfall result for year ${year}`);
        
        res.send(response);
      });
    });
  } catch (error) {
    console.error('Exception in ee-rainfall-layer endpoint:', error);
    res.status(500).send({ 
      success: false, 
      error: error.message 
    });
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

// Debug anomaly route
app.get('/debug-anomaly', (req, res) => {
  res.sendFile(path.join(__dirname, 'debug-anomaly.html'));
});

// Test anomaly calculation endpoint
app.get('/test-anomaly-calc', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || 2000;
    
    // Location parameters - use default coordinates if not provided for testing
    const locationName = req.query.location || 'Test Location';
    const lat = parseFloat(req.query.lat) || 0;
    const lng = parseFloat(req.query.lng) || 0;
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    console.log(`Testing anomaly calculation for year ${year}, location: ${locationName}...`);
    
    if (!ee.data.getAuthToken()) {
      return res.status(500).json({ 
        success: false, 
        error: 'Earth Engine not authenticated' 
      });
    }
    
    // Quick test of baseline calculation
    const baselineCollection = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date('1980-01-01', '2000-12-31'))
      .select('mean_2m_air_temperature');
    
    const baseline = baselineCollection.mean().subtract(273.15);
    
    // Current year
    const yearCollection = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
      .select('mean_2m_air_temperature');
    
    const yearTemp = yearCollection.mean().subtract(273.15);
    const anomaly = yearTemp.subtract(baseline);
    
    // Get sample values
    let locationROI;
    try {
      locationROI = await getLocationROI(locationName, lat, lng, bounds);
    } catch (error) {
      // For testing, create a simple point-based ROI if location lookup fails
      const point = ee.Geometry.Point([lng, lat]);
      locationROI = ee.Feature(point.buffer(50000)); // 50km radius
    }
    
    const clippedAnomaly = anomaly.clip(locationROI.geometry());
    
    // Get statistics
    clippedAnomaly.reduceRegion({
      reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
      geometry: locationROI.geometry(),
      scale: 25000,
      maxPixels: 1e9
    }).getInfo((stats, error) => {
      if (error) {
        console.error('Error getting anomaly stats:', error);
        res.status(500).json({ success: false, error: error.message });
      } else {
        console.log(`Anomaly statistics for ${year}:`, stats);
        res.json({
          success: true,
          year: year,
          statistics: stats,
          message: `Anomaly calculation test completed for ${year}`
        });
      }
    });
    
  } catch (error) {
    console.error('Error in anomaly test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk load endpoint with Server-Sent Events
app.get('/ee-bulk-load', async (req, res) => {
  const startYear = parseInt(req.query.startYear) || 1979;
  const endYear = parseInt(req.query.endYear) || 2020;
  
  // Location parameters - require location to be specified
  const locationName = req.query.location;
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
  
  // Validate that location is provided
  if (!locationName && (!lat || !lng)) {
    return res.status(400).send({
      success: false,
      error: 'Location name or coordinates (lat, lng) must be provided'
    });
  }
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  let processedYears = 0;
  const totalYears = endYear - startYear + 1;

  try {
    for (let year = startYear; year <= endYear; year++) {
      const cacheKey = `temp_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
      
      // Skip if already cached
      if (tileCache[cacheKey]) {
        processedYears++;
        const progress = Math.round((processedYears / totalYears) * 100);
        res.write(`data: ${JSON.stringify({
          progress,
          year,
          status: `Cached: ${year}`,
          cached: true
        })}\n\n`);
        continue;
      }

      // Send progress update
      res.write(`data: ${JSON.stringify({
        progress: Math.round((processedYears / totalYears) * 100),
        year,
        status: `Loading: ${year}`,
        cached: false
      })}\n\n`);

      // Load data for this year using the same logic as /ee-temp-layer
      const result = await loadYearData(year, locationName, lat, lng, bounds);
      
      if (result.success) {
        // Cache the result
        tileCache[cacheKey] = result;
        processedYears++;
        
        const progress = Math.round((processedYears / totalYears) * 100);
        res.write(`data: ${JSON.stringify({
          progress,
          year,
          status: `Completed: ${year}`,
          cached: false,
          mapid: result.mapid,
          token: result.token,
          urlFormat: result.urlFormat
        })}\n\n`);
      } else {
        console.error(`Failed to load year ${year}:`, result.error);
        res.write(`data: ${JSON.stringify({
          progress: Math.round((processedYears / totalYears) * 100),
          year,
          status: `Error: ${year}`,
          error: result.error
        })}\n\n`);
      }
    }

    // Send completion
    res.write(`data: ${JSON.stringify({
      completed: true,
      totalYears: processedYears,
      progress: 100
    })}\n\n`);
    
  } catch (error) {
    console.error('Bulk loading error:', error);
    res.write(`data: ${JSON.stringify({
      error: error.message
    })}\n\n`);
  }
  
  res.end();
});

// Helper function with 5°C temperature range for maximum contrast
async function loadYearData(year, locationName, lat, lng, bounds) {
  return new Promise(async (resolve) => {
    try {
      const collection = ee.ImageCollection('ECMWF/ERA5/DAILY');
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const dateFiltered = collection.filter(ee.Filter.date(startDate, endDate));
      const dataset = dateFiltered.select('mean_2m_air_temperature');
      const tempCelsius = dataset.mean().subtract(273.15);
      
      let locationROI;
      try {
        locationROI = await getLocationROI(locationName, lat, lng, bounds);
      } catch (error) {
        // Fallback to point-based ROI for bulk loading
        const point = ee.Geometry.Point([lng || 0, lat || 0]);
        locationROI = ee.Feature(point.buffer(50000));
      }
      
      const clippedImage = tempCelsius.clip(locationROI.geometry());
      
      // Very narrow 5°C range for maximum contrast
      const visParams = {
        min: 25,    // 25°C
        max: 30,    // 30°C (5°C total range)
        palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red']
      };
      
      clippedImage.getMap(visParams, (result, error) => {
        if (error) {
          console.error(`Error loading year ${year}:`, error);
          resolve({ success: false, error: error.message });
        } else {
          resolve({
            success: true,
            mapid: result.mapid,
            token: result.token || '',
            year: year,
            dataType: 'temperature',
            urlFormat: result.urlFormat
          });
        }
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

// Combined weather endpoint for temperature + wind data
app.get('/ee-weather-layer', async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const nocache = req.query.nocache === 'true';
    
    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }
    
    if (!year || year < 1979 || year > 2020) {
      return res.status(400).json({ 
        success: false, 
        error: 'Year must be between 1979 and 2020' 
      });
    }

    const cacheKey = `weather_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
    
    if (!nocache && tileCache[cacheKey]) {
      console.log(`Cache hit for weather data ${year}`);
      return res.json(tileCache[cacheKey]);
    }

    console.log(`Loading weather data for year ${year}...`);
    
    // Load ERA5 collection
    const collection = ee.ImageCollection('ECMWF/ERA5/DAILY');
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const dateFiltered = collection.filter(ee.Filter.date(startDate, endDate));
    
    // Temperature processing
    const tempDataset = dateFiltered.select('mean_2m_air_temperature');
    const tempCelsius = tempDataset.mean().subtract(273.15);
    
    // Wind processing
    const windU = dateFiltered.select('u_component_of_wind_10m').mean();
    const windV = dateFiltered.select('v_component_of_wind_10m').mean();
    
    // Get location boundary
    const locationROI = await getLocationROI(locationName, lat, lng, bounds);
    
    // Clip data to region
    const clippedTemp = tempCelsius.clip(locationROI);
    const clippedWindU = windU.clip(locationROI);
    const clippedWindV = windV.clip(locationROI);
    
    // Enhanced temperature visualization for weather mode
    const tempVisParams = {
      min: 10,    // Winter minimum
      max: 50,    // Summer maximum
      palette: [
        // Cold (10-20°C) - Blues and purples
        '000080', '0040ff', '0080ff', '00c0ff', '80e0ff',
        // Cool (20-25°C) - Light blues to cyan
        '00ffff', '80ffff', 'c0ffff',
        // Mild (25-30°C) - Greens
        '00ff80', '40ff40', '80ff00', 'c0ff00',
        // Warm (30-35°C) - Yellows
        'ffff00', 'ffd000', 'ffa000',
        // Hot (35-40°C) - Oranges
        'ff8000', 'ff6000', 'ff4000',
        // Very Hot (40-45°C) - Reds
        'ff2000', 'ff0000', 'e00000',
        // Extreme (45-50°C) - Dark reds
        'c00000', 'a00000', '800000'
      ]
    };
    
    // Get temperature map tiles
    const tempMapPromise = new Promise((resolve, reject) => {
      clippedTemp.getMap(tempVisParams, (result, error) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    
    // Enhanced wind visualization using wind speed magnitude
    const windDataPromise = new Promise((resolve, reject) => {
      // Calculate wind speed magnitude: sqrt(u² + v²)
      const windSpeed = windU.pow(2).add(windV.pow(2)).sqrt();
      const clippedWindSpeed = windSpeed.clip(locationROI);
      
      // Wind speed visualization parameters
      const windVisParams = {
        min: 0,     // Calm
        max: 15,    // Strong wind (m/s)
        palette: [
          'ffffff',   // 0 m/s - White (calm)
          'e0f0ff',   // 1-2 m/s - Very light blue
          'c0e0ff',   // 2-4 m/s - Light blue  
          '80d0ff',   // 4-6 m/s - Blue
          '40a0ff',   // 6-8 m/s - Medium blue
          '0080ff',   // 8-10 m/s - Strong blue
          '0060c0',   // 10-12 m/s - Dark blue
          '004080',   // 12-15 m/s - Very dark blue
          '002040'    // 15+ m/s - Navy
        ]
      };
      
      // Generate wind speed map
      clippedWindSpeed.getMap(windVisParams, (result, error) => {
        if (error) {
          console.error('Wind map generation error:', error);
          // Provide fallback wind data
          resolve({
            type: 'fallback',
            message: 'Wind visualization temporarily unavailable',
            mapid: null,
            token: null
          });
        } else {
          console.log('Wind speed map generated successfully');
          resolve({
            type: 'tiles',
            mapid: result.mapid,
            token: result.token || '',
            urlFormat: result.urlFormat,
            description: 'Wind speed magnitude (m/s)',
            legend: {
              min: 0,
              max: 15,
              unit: 'm/s',
              title: 'Wind Speed'
            }
          });
        }
      });
    });
    
    // Wait for both temperature and wind data
    const [tempResult, windResult] = await Promise.all([tempMapPromise, windDataPromise]);
    
    const response = {
      success: true,
      year: year,
      temperature: {
        mapid: tempResult.mapid,
        token: tempResult.token || '',
        urlFormat: tempResult.urlFormat
      },
      wind: windResult
    };
    
    // Cache the result
    tileCache[cacheKey] = response;
    console.log(`Weather data loaded and cached for year ${year}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error in weather layer endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load weather data: ' + error.message
    });
  }
});

// Simplified anomaly detection endpoint
app.get('/ee-anomaly-layer', async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    
    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }
    
    if (!year || year < 1979 || year > 2020) {
      return res.status(400).json({ 
        success: false, 
        error: 'Year must be between 1979 and 2020' 
      });
    }

    const cacheKey = `anomaly_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
    
    if (tileCache[cacheKey]) {
      console.log(`Returning cached anomaly data for year ${year}`);
      return res.json(tileCache[cacheKey]);
    }

    console.log(`🌡️ Calculating temperature anomaly for year ${year}...`);
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).json({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }

    // Use a simpler approach - compare with 1980-2000 baseline
    console.log('📊 Loading baseline temperature data (1980-2000)...');
    
    // Baseline period (20 years for stability)
    const baselineStart = '1980-01-01';
    const baselineEnd = '2000-12-31';
    
    // Current year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    // Calculate baseline (1980-2000 average) - 20 year period for stability
    console.log('Loading baseline period (1980-2000)...');
    const baselineCollection = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date('1980-01-01', '2000-12-31'))
      .select('mean_2m_air_temperature');
    
    // Check baseline data availability
    baselineCollection.size().getInfo((baselineSize, baselineError) => {
      if (baselineError) {
        console.error('Error checking baseline dataset:', baselineError);
        return res.status(500).json({
          success: false,
          error: `Error accessing baseline data: ${baselineError.message}`
        });
      }
      
      if (baselineSize === 0) {
        console.log('No baseline data found');
        return res.status(500).json({
          success: false,
          error: 'No baseline temperature data available (1980-2000)'
        });
      }
      
      console.log(`Found ${baselineSize} baseline images`);
      
      // Calculate baseline mean and convert to Celsius
      const baseline = baselineCollection.mean().subtract(273.15);
      
      // Current year temperature
      console.log(`Loading current year data (${year})...`);
      const yearCollection = ee.ImageCollection('ECMWF/ERA5/DAILY')
        .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
        .select('mean_2m_air_temperature');
      
      // Check current year data availability
      yearCollection.size().getInfo((yearSize, yearError) => {
        if (yearError) {
          console.error('Error checking year dataset:', yearError);
          return res.status(500).json({
            success: false,
            error: `Error accessing ${year} data: ${yearError.message}`
          });
        }
        
        if (yearSize === 0) {
          console.log(`No data found for year ${year}`);
          return res.status(404).json({
            success: false,
            error: `No temperature data available for year ${year}`
          });
        }
        
        console.log(`Found ${yearSize} images for year ${year}`);
        
        // Calculate year mean and convert to Celsius
        const yearTemp = yearCollection.mean().subtract(273.15);
        
        // Calculate anomaly (difference from baseline)
        const anomaly = yearTemp.subtract(baseline);
        
        // Get location boundary
        getLocationROI(locationName, lat, lng, bounds).then(locationROI => {
        
        const clippedAnomaly = anomaly.clip(locationROI);
        
        // Get statistics for the anomaly to understand the data range
        console.log(`Getting anomaly statistics for year ${year}...`);
        clippedAnomaly.reduceRegion({
          reducer: ee.Reducer.minMax(),
          geometry: locationROI.geometry(),
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
        
        // Enhanced diverging color palette for anomalies (0.5°C precision)
        // Improved range to capture subtle temperature variations
        const anomalyVisParams = {
          min: -3,  // 3°C cooler than baseline
          max: 3,   // 3°C warmer than baseline
          palette: [
            // Very cold anomalies (-3 to -2°C)
            '#000080', '#0020a0', '#0040c0',
            // Cold anomalies (-2 to -1°C)  
            '#0060e0', '#0080ff', '#40a0ff',
            // Slightly cool (-1 to -0.5°C)
            '#80c0ff', '#c0e0ff',
            // Near normal (-0.5 to +0.5°C)
            '#f0f8ff', '#ffffff', '#fff8f0',
            // Slightly warm (+0.5 to +1°C)
            '#ffe0c0', '#ffc080',
            // Warm anomalies (+1 to +2°C)
            '#ff8040', '#ff6000', '#ff4000',
            // Very warm anomalies (+2 to +3°C)
            '#e02000', '#c00000', '#800000'
          ]
        };
        
        console.log('Generating anomaly map tiles with optimized range (-2°C to +2°C)...');
        
        clippedAnomaly.getMap(anomalyVisParams, (result, error) => {
          if (error) {
            console.error('Error generating anomaly map:', error);
            res.status(500).json({ 
              success: false, 
              error: `Failed to generate anomaly map: ${error.message}` 
            });
          } else if (!result || !result.mapid) {
            console.error('Invalid anomaly map result - missing mapid');
            res.status(500).json({
              success: false,
              error: 'Invalid anomaly map data received from Earth Engine'
            });
          } else {
            console.log(`Successfully generated anomaly map ID: ${result.mapid}`);
            
            const response = {
              success: true,
              mapid: result.mapid,
              token: result.token || '',
              urlFormat: result.urlFormat,
              year: year,
              dataType: 'anomaly',
              units: '°C difference from 1980-2000 baseline',
              source: 'ERA5 Daily Aggregates',
              baseline: '1980-2000 average'
            };
            
            tileCache[cacheKey] = response;
            res.json(response);
          }
        });
        
        }).catch(locationError => {
          console.error('Error getting location ROI in anomaly endpoint:', locationError);
          return res.status(500).json({
            success: false,
            error: `Failed to load location data: ${locationError.message}`
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Error in anomaly endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: `Anomaly calculation failed: ${error.message}` 
    });
  }
});

// 3D Terrain endpoint
app.get('/ee-terrain-layer', async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    
    // Location parameters - require location to be specified
    const locationName = req.query.location;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bounds = req.query.bounds ? JSON.parse(req.query.bounds) : null;
    
    // Validate that location is provided
    if (!locationName && (!lat || !lng)) {
      return res.status(400).send({
        success: false,
        error: 'Location name or coordinates (lat, lng) must be provided'
      });
    }
    
    if (!year || year < 1979 || year > 2020) {
      return res.status(400).json({ 
        success: false, 
        error: 'Year must be between 1979 and 2020' 
      });
    }

    const cacheKey = `terrain_${year}_${locationName ? locationName.replace(/[^a-zA-Z0-9]/g, '_') : `${lat}_${lng}`}`;
    
    if (tileCache[cacheKey]) {
      return res.json(tileCache[cacheKey]);
    }

    console.log(`Loading 3D terrain temperature for year ${year}...`);
    
    // Check if Earth Engine is initialized
    if (!ee.data.getAuthToken()) {
      console.error('Earth Engine not authenticated');
      return res.status(500).json({ 
        success: false, 
        error: 'Earth Engine not authenticated. Please restart the server.' 
      });
    }
    
    // Load elevation data (SRTM)
    const elevation = ee.Image('USGS/SRTMGL1_003');
    
    // Generate hillshade
    const hillshade = ee.Terrain.hillshade(elevation);
    
    // Load temperature data for the specific year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const collection = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date(startDate, endDate))
      .select('mean_2m_air_temperature');
    
    // Check if data exists
    collection.size().getInfo((size, sizeError) => {
      if (sizeError) {
        console.error('Error checking terrain dataset size:', sizeError);
        return res.status(500).json({
          success: false,
          error: `Error accessing ERA5 data: ${sizeError.message}`
        });
      }
      
      if (size === 0) {
        console.log(`No ERA5 data found for year ${year}`);
        return res.status(404).json({
          success: false,
          error: `No temperature data available for year ${year}`
        });
      }
      
      console.log(`Found ${size} images for terrain visualization`);
      
      // Calculate mean temperature and convert to Celsius
      const tempCelsius = collection.mean().subtract(273.15);
      
      // Get location boundary
      getLocationROI(locationName, lat, lng, bounds).then(locationROI => {
      
      const clippedTemp = tempCelsius.clip(locationROI);
      const clippedHillshade = hillshade.clip(locationROI);
      
      // Create temperature visualization
      const tempVis = clippedTemp.visualize({
        min: 15,
        max: 45,
        palette: ['#000080', '#0040ff', '#0080ff', '#00c0ff', '#80e0ff', '#ffffff',
                  '#ffe080', '#ffc040', '#ff8000', '#ff4000', '#ff0000', '#800000']
      });
      
      // Create hillshade visualization (grayscale)
      const hillshadeVis = clippedHillshade.visualize({
        min: 0,
        max: 255,
        palette: ['#000000', '#ffffff']
      });
      
      // Blend layers using proper Earth Engine blending
      const blended = tempVis.blend(hillshadeVis.multiply(0.3));
      
      console.log('Generating terrain map tiles...');
      
      blended.getMap({}, (result, error) => {
        if (error) {
          console.error('Error generating terrain map:', error);
          res.status(500).json({ 
            success: false, 
            error: `Failed to generate terrain map: ${error.message}` 
          });
        } else if (!result || !result.mapid) {
          console.error('Invalid terrain map result - missing mapid');
          res.status(500).json({
            success: false,
            error: 'Invalid terrain map data received from Earth Engine'
          });
        } else {
          console.log(`Successfully generated terrain map ID: ${result.mapid}`);
          
          const response = {
            success: true,
            mapid: result.mapid,
            token: result.token || '',
            urlFormat: result.urlFormat,
            year: year,
            dataType: 'terrain',
            units: 'Celsius with elevation',
            source: 'ERA5 + SRTM'
          };
          
          tileCache[cacheKey] = response;
          res.json(response);
        }
      });
      
      }).catch(locationError => {
        console.error('Error getting location ROI in terrain endpoint:', locationError);
        return res.status(500).json({
          success: false,
          error: `Failed to load location data: ${locationError.message}`
        });
      });
    });
    
  } catch (error) {
    console.error('Error in terrain endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: `Terrain processing failed: ${error.message}` 
    });
  }
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
