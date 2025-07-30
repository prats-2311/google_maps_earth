// Global variables
let map;
let currentOverlay = null;
let selectedYear = 2000; // Middle of available range to show historical progression
let isLoading = false;
let isInitialized = false;
let earthEngineData = {}; // Store Earth Engine responses for analysis

// Global variables for user-controlled time-lapse
let timelapseData = {};
let isTimelapseActive = false;
let currentTimelapseYear = 1979;
let timelapseYears = [];
let currentYearIndex = 0;

// Enhanced caching for all data types
let cachedVisualizationData = {
  temperature: {},
  weather: {},
  anomaly: {},
  terrain: {}
};

// Enhanced visualization modes
let currentVisualizationMode = 'temperature'; // 'temperature', 'weather', 'anomaly', 'terrain'
let windLayer = null;
let isImmersiveMode = false;
let temperatureParticles = [];
let animationFrame = null;

// Utility function for debouncing
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Initialize the map when the page loads
window.onload = function() {
  console.log("Window loaded, setting up event listeners...");
  setupEventListeners();
  
  if (!isInitialized) {
    console.log("App not yet initialized, showing loading spinner...");
    showLoadingSpinner();
  }
};

// This function will be called by Google Maps API when it's loaded (callback)
window.initMap = function() {
  console.log("Google Maps API loaded, initializing map...");
  try {
    initMapInternal();
    isInitialized = true;
    console.log("Map initialization completed successfully");
  } catch (error) {
    console.error("Error in initMap:", error);
    hideLoadingSpinner();
    showError("Failed to initialize Google Maps: " + error.message);
  }
};

// Ensure initMap is available globally for the callback
if (typeof window !== 'undefined') {
  // Make sure initMap is properly exposed to the global scope
  window.initMap = function() {
    console.log("Google Maps API loaded, initializing map...");
    try {
      initMapInternal();
      isInitialized = true;
      console.log("Map initialization completed successfully");
    } catch (error) {
      console.error("Error in initMap:", error);
      hideLoadingSpinner();
      showError("Failed to initialize Google Maps: " + error.message);
    }
  };
}

// Initialize Google Map
function initMapInternal() {
  try {
    console.log("Initializing Google Map...");
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.error("Google Maps API not loaded!");
      showError("Google Maps API failed to load. Please refresh the page.");
      return;
    }
    
    const uttarPradeshCenter = { lat: 26.8467, lng: 80.9462 };
    const uttarPradeshBounds = {
      north: 29.3, south: 23.9, east: 84.6, west: 77.1
    };
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error("Map element not found!");
      showError("Map container element not found.");
      return;
    }
    
    // Create map with better initial settings
    map = new google.maps.Map(mapElement, {
      center: uttarPradeshCenter,
      zoom: 7,
      mapTypeId: 'terrain',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      restriction: {
        latLngBounds: uttarPradeshBounds,
        strictBounds: false
      }
    });
    
    console.log("Map created, waiting for idle state...");
    
    // Wait for map to be fully loaded before adding overlays
    google.maps.event.addListenerOnce(map, 'idle', function() {
      console.log("Map is idle, loading initial visualization...");
      hideLoadingSpinner();
      
      // Load initial visualization instead of just temperature
      loadVisualization(selectedYear);
      
      // Add visualization controls
      setTimeout(() => {
        addVisualizationControls();
      }, 1000);
      
      if (window.appLoaded) {
        window.appLoaded();
      }
    });
    
  } catch (error) {
    console.error("Error initializing map:", error);
    hideLoadingSpinner();
    showError("Failed to initialize map: " + error.message);
  }
}

// Set up event listeners for UI controls
function setupEventListeners() {
  // Year slider with debouncing
  const yearSlider = document.getElementById('year-slider');
  const selectedYearDisplay = document.getElementById('selected-year');
  
  if (yearSlider && selectedYearDisplay) {
    // Create debounced version for visualization loading
    const debouncedLoadVisualization = debounce(function(year) {
      selectedYear = year;
      loadVisualization(year);
    }, 100);
    
    yearSlider.addEventListener('input', function(e) {
      const year = parseInt(e.target.value);
      selectedYearDisplay.textContent = year;
      debouncedLoadVisualization(year);
    });
  }
  
  // Prediction button
  const predictBtn = document.getElementById('predict-btn');
  if (predictBtn) {
    predictBtn.addEventListener('click', function() {
      showLoadingSpinner();
      setTimeout(() => {
        trainAndPredict();
        fetchAirQuality();
        hideLoadingSpinner();
        
        // Show the immersive panel after prediction
        const immersivePanel = document.getElementById('immersive-panel');
        if (immersivePanel) {
          immersivePanel.classList.remove('hidden');
        }
      }, 1500);
    });
  }
  
  // Solar potential button
  const solarBtn = document.getElementById('show-solar-btn');
  if (solarBtn) {
    solarBtn.addEventListener('click', function() {
      showSolarPotential();
    });
  }
  
  // Cooling zones button
  const coolingBtn = document.getElementById('show-cooling-zones-btn');
  if (coolingBtn) {
    coolingBtn.addEventListener('click', function() {
      showCoolingZones();
    });
  }
  
  // Load all historical data button
  const loadAllDataBtn = document.getElementById('load-all-data-btn');
  if (loadAllDataBtn) {
    loadAllDataBtn.addEventListener('click', function() {
      startBulkLoading();
    });
  }
  
  // User-controlled time-lapse navigation buttons
  const timelapseStartBtn = document.getElementById('timelapse-start-btn');
  if (timelapseStartBtn) {
    timelapseStartBtn.addEventListener('click', () => navigateToYear('first'));
  }
  
  const timelapsePrevBtn = document.getElementById('timelapse-prev-btn');
  if (timelapsePrevBtn) {
    timelapsePrevBtn.addEventListener('click', () => navigateToYear('prev'));
  }
  
  const timelapseNextBtn = document.getElementById('timelapse-next-btn');
  if (timelapseNextBtn) {
    timelapseNextBtn.addEventListener('click', () => navigateToYear('next'));
  }
  
  const timelapseEndBtn = document.getElementById('timelapse-end-btn');
  if (timelapseEndBtn) {
    timelapseEndBtn.addEventListener('click', () => navigateToYear('last'));
  }
  
  const timelapseJumpBtn = document.getElementById('timelapse-jump-btn');
  if (timelapseJumpBtn) {
    timelapseJumpBtn.addEventListener('click', () => {
      const selectedYear = document.getElementById('timelapse-jump-year').value;
      if (selectedYear) {
        navigateToYear(parseInt(selectedYear));
      }
    });
  }
  
  const timelapseExitBtn = document.getElementById('timelapse-exit-btn');
  if (timelapseExitBtn) {
    timelapseExitBtn.addEventListener('click', () => exitTimelapse());
  }
  
  const timelapseAutoPlayBtn = document.getElementById('timelapse-auto-play-btn');
  if (timelapseAutoPlayBtn) {
    timelapseAutoPlayBtn.addEventListener('click', () => startAutoPlay());
  }
  
  // Immersive view buttons
  const immersiveViewBtn = document.getElementById('immersive-view-btn');
  if (immersiveViewBtn) {
    immersiveViewBtn.addEventListener('click', function() {
      showImmersiveView();
    });
  }
  
  const closeImmersiveBtn = document.getElementById('close-immersive-btn');
  if (closeImmersiveBtn) {
    closeImmersiveBtn.addEventListener('click', function() {
      hideImmersiveView();
    });
  }
  
  // Add visualization controls after map is ready
  setTimeout(() => {
    if (document.getElementById('map') && typeof addVisualizationControls === 'function') {
      addVisualizationControls();
    }
  }, 2000);
}

// Load the dedicated Earth Engine temperature layer for time-lapse feature
function loadTemperatureLayer(year) {
  if (isLoading) {
    console.log("Already loading temperature data, request ignored");
    return;
  }
  
  isLoading = true;
  showLoadingSpinner();
  
  console.log(`Loading temperature layer for year ${year}...`);
  
  // Remove previous overlay completely
  if (currentOverlay) {
    console.log("Removing previous temperature overlay");
    map.overlayMapTypes.clear();
    currentOverlay = null;
  }
  
  // Remove existing legend
  const existingLegend = document.getElementById('temp-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  // Fetch temperature data
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'true';
  const cacheParam = debugMode ? '&nocache=true' : '';
  
  fetch(`/ee-temp-layer?year=${year}${cacheParam}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Temperature layer response:', data);
      
      if (data.success && data.mapid) {
        // Create tile URL function
        let getTileUrlFunction;
        
        if (data.urlFormat) {
          getTileUrlFunction = function(tile, zoom) {
            const url = data.urlFormat
              .replace('{z}', zoom)
              .replace('{x}', tile.x)
              .replace('{y}', tile.y);
            console.log(`Tile URL: ${url}`);
            return url;
          };
        } else {
          getTileUrlFunction = function(tile, zoom) {
            const baseUrl = `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}`;
            const token = data.token ? `?token=${data.token}` : '';
            const cacheBuster = `${token ? '&' : '?'}cb=${Date.now()}&year=${year}`;
            const url = `${baseUrl}${token}${cacheBuster}`;
            console.log(`Tile URL: ${url}`);
            return url;
          };
        }
        
        // Create the tile source
        const tileSource = new google.maps.ImageMapType({
          name: `Temperature ${year}`,
          getTileUrl: getTileUrlFunction,
          tileSize: new google.maps.Size(256, 256),
          minZoom: 1,
          maxZoom: 20,
          opacity: 0.7
        });
        
        // Add overlay
        console.log("Adding temperature layer to map");
        map.overlayMapTypes.clear();
        map.overlayMapTypes.insertAt(0, tileSource);
        currentOverlay = tileSource;
        
        // Add temperature legend
        addTemperatureLegend();
        
        // Force map refresh
        setTimeout(() => {
          google.maps.event.trigger(map, 'resize');
          map.setZoom(map.getZoom());
        }, 500);
        
        console.log(`Temperature layer loaded for year ${year}`);
        hideLoadingSpinner();
      }
    })
    .catch(error => {
      console.error('Error loading temperature layer:', error);
      hideLoadingSpinner();
      showError('Failed to load temperature data: ' + error.message);
    })
    .finally(() => {
      isLoading = false;
    });
}

// Load the Earth Engine rainfall layer for a specific year
function loadRainfallLayer(year) {
  // Prevent multiple simultaneous requests
  if (isLoading) {
    console.log("Already loading rainfall data, request ignored");
    return;
  }
  
  isLoading = true;
  showLoadingSpinner();
  
  // Performance monitoring
  const startTime = performance.now();
  console.log(`Loading rainfall layer for year ${year}...`);
  
  // Remove previous overlay if it exists
  if (currentOverlay) {
    console.log("Removing previous rainfall overlay");
    
    // Check if it's a rectangle (simulated data) or a map overlay
    if (currentOverlay instanceof google.maps.Rectangle) {
      currentOverlay.setMap(null);
    } else {
      // Assume it's a map overlay
      map.overlayMapTypes.clear();
    }
    
    currentOverlay = null;
  }
  
  // Fetch the rainfall layer from our backend
  console.log("Fetching rainfall layer from backend...");
  fetch(`/ee-rainfall-layer?year=${year}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Received rainfall response from server:", data);
      if (data.success) {
        console.log("Received successful rainfall response:", data);
        
        // Store the Earth Engine data for analysis
        earthEngineData[`rainfall_${year}`] = data;
        console.log("Rainfall data structure for year", year, ":", {
          success: data.success,
          mapid: data.mapid,
          token: data.token,
          year: data.year,
          dataType: data.dataType,
          units: data.units,
          source: data.source,
          region: data.region,
          urlFormat: data.urlFormat
        });
        
        // Create the tile layer using the mapid and token (or urlFormat for newer API)
        console.log("Creating rainfall tile layer with mapid:", data.mapid);
        
        let getTileUrlFunction;
        
        if (data.urlFormat) {
          // Use the new urlFormat from Earth Engine API
          console.log("Using new Earth Engine API urlFormat:", data.urlFormat);
          getTileUrlFunction = function(tile, zoom) {
            return data.urlFormat.replace('{z}', zoom).replace('{x}', tile.x).replace('{y}', tile.y);
          };
        } else {
          // Use the legacy format with mapid and token
          console.log("Using legacy Earth Engine API format");
          getTileUrlFunction = function(tile, zoom) {
            return `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}?token=${data.token}`;
          };
        }
        
        const tileSource = new google.maps.ImageMapType({
          name: `Rainfall ${year}`,
          getTileUrl: getTileUrlFunction,
          tileSize: new google.maps.Size(256, 256),
          minZoom: 1,
          maxZoom: 20,
          opacity: 0.6 // Make rainfall overlay semi-transparent
        });
        
        // Add the layer to the map
        console.log("Adding rainfall layer to map");
        map.overlayMapTypes.clear();
        map.overlayMapTypes.push(tileSource);
        currentOverlay = tileSource;
        
        console.log("Rainfall layer added successfully");
        
        // Wait for tiles to start loading, then hide spinner
        setTimeout(() => {
          const endTime = performance.now();
          const loadTime = (endTime - startTime).toFixed(2);
          console.log(`Rainfall layer loaded for year ${year} in ${loadTime}ms`);
          hideLoadingSpinner();
        }, 1500);
        
        // Also hide spinner immediately if user clicks close button
        const closeBtn = document.getElementById('close-loading-btn');
        if (closeBtn) {
          closeBtn.style.display = 'block';
          closeBtn.style.pointerEvents = 'auto';
        }
      } else {
        console.error('Error loading rainfall layer:', data.error);
        hideLoadingSpinner();
        showError('Error loading rainfall data: ' + (data.error || 'Unknown error'));
      }
      isLoading = false;
    })
    .catch(error => {
      console.error('Network or parsing error:', error);
      hideLoadingSpinner();
      
      // Show error message instead of alert
      const errorMessage = document.getElementById('error-message');
      const errorText = document.getElementById('error-text');
      
      if (errorMessage && errorText) {
        errorText.textContent = 'Error loading rainfall data: ' + error.message;
        errorMessage.classList.remove('hidden');
      } else {
        alert('Error: ' + error.message);
      }
      
      isLoading = false;
    });
}

// Load the Earth Engine timelapse layer for a specific year (legacy function)
function loadTimelapseLayer(year) {
  // For backward compatibility, call the new temperature layer function
  loadTemperatureLayer(year);
}

// Analyze Earth Engine data structure and format
function analyzeEarthEngineData() {
  console.log("=== EARTH ENGINE DATA ANALYSIS ===");
  console.log("Collected Earth Engine responses:", earthEngineData);
  
  // Analyze the data structure
  const dataKeys = Object.keys(earthEngineData);
  if (dataKeys.length > 0) {
    const sampleData = earthEngineData[dataKeys[0]];
    console.log("Sample Earth Engine response structure:");
    console.log("- success:", typeof sampleData.success, "->", sampleData.success);
    console.log("- mapid:", typeof sampleData.mapid, "->", sampleData.mapid);
    console.log("- token:", typeof sampleData.token, "->", sampleData.token);
    console.log("- year:", typeof sampleData.year, "->", sampleData.year);
    console.log("- simulated:", typeof sampleData.simulated, "->", sampleData.simulated);
    console.log("- urlFormat:", typeof sampleData.urlFormat, "->", sampleData.urlFormat);
    
    // Analyze URL format for tile access
    if (sampleData.urlFormat) {
      console.log("URL Format Analysis:");
      console.log("- Base URL:", sampleData.urlFormat.split('/tiles/')[0]);
      console.log("- Tile pattern:", sampleData.urlFormat.split('/tiles/')[1]);
      console.log("- Uses new Earth Engine API format");
    } else {
      console.log("- Uses legacy Earth Engine API format with mapid + token");
    }
  }
  
  console.log("=== DATA INTEGRATION WITH TENSORFLOW ===");
  console.log("Historical data format (from data.js):");
  console.log("- Structure: { year: number, avgTemp: number }");
  console.log("- Sample:", historicalTemperatureData.slice(0, 3));
  console.log("- Total records:", historicalTemperatureData.length);
  
  console.log("Integration approach:");
  console.log("1. Earth Engine provides spatial temperature data (raster tiles)");
  console.log("2. Historical data provides temporal temperature trends (time series)");
  console.log("3. TensorFlow.js uses historical data for training");
  console.log("4. Google Maps displays Earth Engine raster data");
  console.log("5. Future enhancement: Extract pixel values from Earth Engine for training");
}

// Train TensorFlow.js model and predict future temperatures
function trainAndPredict() {
  // First analyze the data structure
  analyzeEarthEngineData();
  
  // Extract features (years) and labels (temperatures) from historical data
  const years = historicalTemperatureData.map(d => d.year);
  const temps = historicalTemperatureData.map(d => d.avgTemp);
  
  // Normalize the data
  const yearMin = Math.min(...years);
  const yearMax = Math.max(...years);
  const normalizedYears = years.map(y => (y - yearMin) / (yearMax - yearMin));
  
  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  const normalizedTemps = temps.map(t => (t - tempMin) / (tempMax - tempMin));
  
  // Convert to tensors
  const xs = tf.tensor2d(normalizedYears, [normalizedYears.length, 1]);
  const ys = tf.tensor2d(normalizedTemps, [normalizedTemps.length, 1]);
  
  // Create and compile the model
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 10, inputShape: [1], activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  
  // Train the model
  model.fit(xs, ys, { epochs: 100 }).then(() => {
    // Predict future temperatures
    const futureYears = [2040, 2050, 2060];
    const normalizedFutureYears = futureYears.map(y => (y - yearMin) / (yearMax - yearMin));
    const futureTensor = tf.tensor2d(normalizedFutureYears, [normalizedFutureYears.length, 1]);
    
    const predictions = model.predict(futureTensor);
    const normalizedPredictions = predictions.dataSync();
    
    // Denormalize the predictions
    const predictedTemps = normalizedPredictions.map(p => p * (tempMax - tempMin) + tempMin);
    
    // Display the predictions
    document.getElementById('temp-2040').textContent = `${predictedTemps[0].toFixed(1)}°C`;
    document.getElementById('temp-2050').textContent = `${predictedTemps[1].toFixed(1)}°C`;
    document.getElementById('temp-2060').textContent = `${predictedTemps[2].toFixed(1)}°C`;
    document.getElementById('prediction-results').classList.remove('hidden');
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
    futureTensor.dispose();
    predictions.dispose();
  });
}

// Fetch air quality data for Lucknow
function fetchAirQuality() {
  // In a real application, this would call the Google Maps Platform Air Quality API
  // For this demo, we'll simulate the API response
  
  // Simulate API call delay
  setTimeout(() => {
    // Sample AQI data (simulated)
    const aqiValue = Math.floor(Math.random() * (300 - 150) + 150);
    let aqiCategory, categoryColor;
    
    if (aqiValue <= 50) {
      aqiCategory = "Good";
      categoryColor = "#009966";
    } else if (aqiValue <= 100) {
      aqiCategory = "Moderate";
      categoryColor = "#ffde33";
    } else if (aqiValue <= 150) {
      aqiCategory = "Unhealthy for Sensitive Groups";
      categoryColor = "#ff9933";
    } else if (aqiValue <= 200) {
      aqiCategory = "Unhealthy";
      categoryColor = "#cc0033";
    } else if (aqiValue <= 300) {
      aqiCategory = "Very Unhealthy";
      categoryColor = "#660099";
    } else {
      aqiCategory = "Hazardous";
      categoryColor = "#7e0023";
    }
    
    // Update the UI
    document.getElementById('aqi-value').textContent = aqiValue;
    const categoryElement = document.getElementById('aqi-category');
    categoryElement.textContent = aqiCategory;
    categoryElement.style.backgroundColor = categoryColor;
    categoryElement.style.color = (aqiValue <= 100) ? '#000' : '#fff';
    
    document.getElementById('air-quality-panel').classList.remove('hidden');
  }, 1000);
}

// Show solar potential for buildings
function showSolarPotential() {
  // In a real application, this would use the Google Maps Platform Solar API
  // For this demo, we'll set up a click listener on the map
  
  alert('Click on any building to see its solar potential.');
  
  // Set up a click listener on the map
  google.maps.event.addListenerOnce(map, 'click', function(event) {
    const clickedLocation = event.latLng;
    
    // Simulate solar potential data
    const solarPotential = {
      maxSunshineHoursPerYear: Math.floor(Math.random() * (2800 - 2200) + 2200),
      solarPanelCapacity: Math.floor(Math.random() * (15 - 5) + 5),
      annualEnergyProduction: Math.floor(Math.random() * (12000 - 5000) + 5000),
      carbonOffsetPerYear: Math.floor(Math.random() * (8 - 3) + 3)
    };
    
    // Create an info window with the solar potential data
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h3 style="margin-top: 0;">Solar Potential</h3>
          <p><strong>Max Sunshine:</strong> ${solarPotential.maxSunshineHoursPerYear} hours/year</p>
          <p><strong>Potential Capacity:</strong> ${solarPotential.solarPanelCapacity} kW</p>
          <p><strong>Est. Annual Production:</strong> ${solarPotential.annualEnergyProduction} kWh</p>
          <p><strong>Carbon Offset:</strong> ${solarPotential.carbonOffsetPerYear} tons CO2/year</p>
        </div>
      `,
      position: clickedLocation
    });
    
    infoWindow.open(map);
  });
}

// Show cooling zones (parks and green spaces)
function showCoolingZones() {
  // In a real application, this would use the Google Maps Platform Places API
  // For this demo, we'll add some sample parks in Lucknow
  
  const parks = [
    { name: "Janeshwar Mishra Park", lat: 26.8543, lng: 80.9762 },
    { name: "Ambedkar Memorial Park", lat: 26.8684, lng: 80.9339 },
    { name: "Gomti Riverfront Park", lat: 26.8601, lng: 80.9346 },
    { name: "Buddha Park", lat: 26.7747, lng: 80.9310 },
    { name: "Dr. Ram Manohar Lohia Park", lat: 26.8728, lng: 80.9459 }
  ];
  
  // Clear any existing markers
  if (window.parkMarkers) {
    window.parkMarkers.forEach(marker => marker.setMap(null));
  }
  
  window.parkMarkers = [];
  
  // Add markers for each park
  parks.forEach(park => {
    const marker = new google.maps.Marker({
      position: { lat: park.lat, lng: park.lng },
      map: map,
      title: park.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4CAF50',
        fillOpacity: 0.6,
        strokeColor: '#388E3C',
        strokeWeight: 2,
        scale: 15
      }
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h3 style="margin-top: 0;">${park.name}</h3>
          <p>Community Cooling Zone</p>
          <p>Temperature reduction: 3-5°C cooler than surrounding areas</p>
        </div>
      `
    });
    
    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
    
    window.parkMarkers.push(marker);
  });
  
  // Add a circle around each park to represent cooling effect
  parks.forEach(park => {
    const circle = new google.maps.Circle({
      strokeColor: '#4CAF50',
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillColor: '#4CAF50',
      fillOpacity: 0.1,
      map: map,
      center: { lat: park.lat, lng: park.lng },
      radius: 1000 // 1km cooling effect
    });
    
    window.parkMarkers.push(circle);
  });
  
  // Zoom to show all parks
  const bounds = new google.maps.LatLngBounds();
  parks.forEach(park => {
    bounds.extend({ lat: park.lat, lng: park.lng });
  });
  map.fitBounds(bounds);
}

// Show immersive 3D view
function showImmersiveView() {
  const immersiveOverlay = document.getElementById('immersive-overlay');
  const immersiveContent = document.getElementById('immersive-content');
  
  // Create an immersive temperature visualization experience
  const currentYear = parseInt(document.getElementById('year-slider').value);
  const currentTemp = getCurrentTemperatureData(currentYear);
  
  immersiveContent.innerHTML = `
    <div class="immersive-dashboard">
      <div class="immersive-header">
        <h1>🌡️ Climate Impact Visualization</h1>
        <h2>Uttar Pradesh, India - Year ${currentYear}</h2>
      </div>
      
      <div class="immersive-content-grid">
        <!-- Main Temperature Visualization -->
        <div class="immersive-main-viz">
          <div id="immersive-map" style="width: 100%; height: 400px; border-radius: 12px;"></div>
          <div class="temperature-overlay">
            <div class="temp-reading">
              <span class="temp-value">${currentTemp.avg}°C</span>
              <span class="temp-label">Average Temperature</span>
            </div>
            <div class="temp-trend ${currentTemp.trend}">
              <span class="trend-icon">${currentTemp.trend === 'rising' ? '📈' : '📉'}</span>
              <span class="trend-text">${currentTemp.trendText}</span>
            </div>
          </div>
        </div>
        
        <!-- Interactive Climate Story -->
        <div class="climate-story">
          <h3>🌍 Climate Story for ${currentYear}</h3>
          <div class="story-content">
            <div class="impact-metric">
              <span class="metric-icon">🔥</span>
              <div class="metric-data">
                <span class="metric-value">${currentTemp.heatDays}</span>
                <span class="metric-label">Heat Wave Days</span>
              </div>
            </div>
            <div class="impact-metric">
              <span class="metric-icon">🌧️</span>
              <div class="metric-data">
                <span class="metric-value">${currentTemp.rainfall}mm</span>
                <span class="metric-label">Annual Rainfall</span>
              </div>
            </div>
            <div class="impact-metric">
              <span class="metric-icon">🏭</span>
              <div class="metric-data">
                <span class="metric-value">${currentTemp.aqi}</span>
                <span class="metric-label">Air Quality Index</span>
              </div>
            </div>
          </div>
          
          <div class="climate-narrative">
            <p>${generateClimateNarrative(currentYear, currentTemp)}</p>
          </div>
        </div>
        
        <!-- Time Travel Controls -->
        <div class="time-travel-controls">
          <h3>⏰ Time Travel</h3>
          <div class="decade-buttons">
            <button onclick="jumpToDecade(1980)" class="decade-btn">1980s</button>
            <button onclick="jumpToDecade(1990)" class="decade-btn">1990s</button>
            <button onclick="jumpToDecade(2000)" class="decade-btn">2000s</button>
            <button onclick="jumpToDecade(2010)" class="decade-btn">2010s</button>
            <button onclick="jumpToDecade(2020)" class="decade-btn">2020s</button>
          </div>
          <button onclick="startImmersiveTimelapse()" class="immersive-timelapse-btn">
            🎬 Play Climate Time-lapse
          </button>
        </div>
        
        <!-- Future Predictions -->
        <div class="future-predictions">
          <h3>🔮 Future Outlook</h3>
          <div class="prediction-cards">
            <div class="prediction-card">
              <span class="prediction-year">2030</span>
              <span class="prediction-temp">+2.1°C</span>
              <span class="prediction-impact">Moderate Risk</span>
            </div>
            <div class="prediction-card">
              <span class="prediction-year">2040</span>
              <span class="prediction-temp">+3.4°C</span>
              <span class="prediction-impact">High Risk</span>
            </div>
            <div class="prediction-card">
              <span class="prediction-year">2050</span>
              <span class="prediction-temp">+4.8°C</span>
              <span class="prediction-impact">Critical Risk</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Immersive Controls -->
      <div class="immersive-controls">
        <button onclick="toggleImmersiveMode('3d')" class="control-btn">🏔️ 3D View</button>
        <button onclick="toggleImmersiveMode('satellite')" class="control-btn">🛰️ Satellite</button>
        <button onclick="toggleImmersiveMode('heatmap')" class="control-btn">🌡️ Heat Map</button>
        <button onclick="showClimateComparison()" class="control-btn">📊 Compare Years</button>
      </div>
    </div>
  `;
  
  immersiveOverlay.classList.remove('hidden');
  
  // Initialize the immersive map
  setTimeout(() => {
    initializeImmersiveMap(currentYear);
  }, 100);
}

// Supporting functions for immersive view
function getCurrentTemperatureData(year) {
  // Generate realistic temperature data based on year
  const baseTemp = 26.5; // Base temperature for UP
  const yearOffset = (year - 1980) * 0.03; // 0.03°C increase per year
  const randomVariation = (Math.random() - 0.5) * 2; // ±1°C random variation
  
  const avgTemp = (baseTemp + yearOffset + randomVariation).toFixed(1);
  const heatDays = Math.floor(30 + yearOffset * 2 + Math.random() * 10);
  const rainfall = Math.floor(800 - yearOffset * 5 + Math.random() * 200);
  const aqi = Math.floor(150 + yearOffset * 3 + Math.random() * 50);
  
  return {
    avg: avgTemp,
    heatDays: heatDays,
    rainfall: rainfall,
    aqi: aqi,
    trend: year > 2000 ? 'rising' : 'stable',
    trendText: year > 2000 ? 'Rising trend' : 'Stable period'
  };
}

function generateClimateNarrative(year, tempData) {
  const narratives = {
    1980: "The 1980s marked a relatively stable climate period for Uttar Pradesh, with traditional monsoon patterns and moderate temperatures.",
    1990: "The 1990s saw the beginning of subtle climate shifts, with slightly warmer summers and changing rainfall patterns.",
    2000: "The new millennium brought noticeable changes - increased heat waves and more unpredictable weather patterns.",
    2010: "The 2010s witnessed significant climate acceleration with record-breaking temperatures and extreme weather events.",
    2020: "Recent years show alarming trends with unprecedented heat waves, erratic monsoons, and deteriorating air quality."
  };
  
  const decade = Math.floor(year / 10) * 10;
  return narratives[decade] || `Year ${year} shows continued climate change impacts with average temperatures of ${tempData.avg}°C and ${tempData.heatDays} heat wave days.`;
}

function initializeImmersiveMap(year) {
  if (typeof google === 'undefined' || !google.maps) {
    console.error('Google Maps not available for immersive view');
    return;
  }
  
  const immersiveMapElement = document.getElementById('immersive-map');
  if (!immersiveMapElement) return;
  
  const uttarPradeshCenter = { lat: 26.8467, lng: 80.9462 };
  
  const immersiveMap = new google.maps.Map(immersiveMapElement, {
    center: uttarPradeshCenter,
    zoom: 8,
    mapTypeId: 'satellite',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {
        featureType: 'all',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }]
      }
    ]
  });
  
  // Store globally for access by control buttons
  window.immersiveMapInstance = immersiveMap;
  
  // Add temperature overlay to immersive map
  if (currentOverlay) {
    immersiveMap.overlayMapTypes.insertAt(0, currentOverlay);
  }
  
  // Add 3D temperature markers for major cities
  add3DTemperatureMarkers(immersiveMap, year);
  
  console.log('🗺️ Immersive map initialized successfully');
}

// Add 3D temperature markers for major cities in Uttar Pradesh
function add3DTemperatureMarkers(map, year) {
  const cities = [
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462, baseTemp: 26.5, isCapital: true },
    { name: 'Kanpur', lat: 26.4499, lng: 80.3319, baseTemp: 27.2, isCapital: false },
    { name: 'Agra', lat: 27.1767, lng: 78.0081, baseTemp: 26.8, isCapital: false },
    { name: 'Varanasi', lat: 25.3176, lng: 82.9739, baseTemp: 26.9, isCapital: false },
    { name: 'Allahabad', lat: 25.4358, lng: 81.8463, baseTemp: 26.7, isCapital: false }
  ];
  
  cities.forEach(city => {
    // Calculate temperature for the year
    const yearOffset = (year - 1980) * 0.03;
    const urbanHeatIsland = city.isCapital ? 1.5 : 0.5;
    const temperature = (city.baseTemp + yearOffset + urbanHeatIsland).toFixed(1);
    
    // Create 3D marker content
    const markerContent = create3DMarkerElement(city.name, temperature, city.isCapital);
    
    // Create Advanced Marker (Google's new 3D marker system)
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: { lat: city.lat, lng: city.lng },
        content: markerContent,
        title: `${city.name}: ${temperature}°C`,
        gmpClickable: true
      });
      
      // Add click event for detailed info
      marker.addListener('click', () => {
        showCityTemperatureDetails(city.name, temperature, year);
      });
    } else {
      // Fallback to regular markers if Advanced Markers not available
      const marker = new google.maps.Marker({
        position: { lat: city.lat, lng: city.lng },
        map: map,
        title: `${city.name}: ${temperature}°C`,
        icon: {
          url: createTemperatureMarkerIcon(temperature),
          scaledSize: new google.maps.Size(40, 40)
        }
      });
      
      marker.addListener('click', () => {
        showCityTemperatureDetails(city.name, temperature, year);
      });
    }
  });
}

// Create 3D marker element with temperature visualization
function create3DMarkerElement(cityName, temperature, isCapital) {
  const markerDiv = document.createElement('div');
  
  // Color based on temperature
  let backgroundColor, textColor;
  if (temperature < 25) {
    backgroundColor = '#4A90E2'; // Blue
    textColor = 'white';
  } else if (temperature < 30) {
    backgroundColor = '#F5A623'; // Orange
    textColor = 'white';
  } else {
    backgroundColor = '#D0021B'; // Red
    textColor = 'white';
  }
  
  markerDiv.style.cssText = `
    background: ${backgroundColor};
    color: ${textColor};
    border-radius: 50% 50% 50% 0;
    width: ${isCapital ? 60 : 50}px;
    height: ${isCapital ? 60 : 50}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: ${isCapital ? 12 : 10}px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    transform: rotate(-45deg);
    border: 3px solid white;
    position: relative;
    transition: all 0.3s ease;
  `;
  
  // Add hover effect
  markerDiv.addEventListener('mouseenter', () => {
    markerDiv.style.transform = 'rotate(-45deg) scale(1.2)';
    markerDiv.style.zIndex = '1000';
  });
  
  markerDiv.addEventListener('mouseleave', () => {
    markerDiv.style.transform = 'rotate(-45deg) scale(1)';
    markerDiv.style.zIndex = 'auto';
  });
  
  // Content (rotated back to be readable)
  const content = document.createElement('div');
  content.style.cssText = `
    transform: rotate(45deg);
    text-align: center;
    line-height: 1.1;
  `;
  
  content.innerHTML = `
    <div style="font-size: ${isCapital ? 14 : 12}px; font-weight: bold;">${temperature}°</div>
    <div style="font-size: ${isCapital ? 8 : 7}px; opacity: 0.9;">${cityName}</div>
  `;
  
  markerDiv.appendChild(content);
  
  // Add capital city indicator
  if (isCapital) {
    const crown = document.createElement('div');
    crown.style.cssText = `
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      font-size: 16px;
    `;
    crown.textContent = '👑';
    markerDiv.appendChild(crown);
  }
  
  return markerDiv;
}

// Fallback function to create marker icon URL
function createTemperatureMarkerIcon(temperature) {
  // This would create a data URL for a temperature-colored marker
  // For now, return a simple colored circle
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  
  // Color based on temperature
  let color;
  if (temperature < 25) color = '#4A90E2';
  else if (temperature < 30) color = '#F5A623';
  else color = '#D0021B';
  
  // Draw circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, Math.PI * 2);
  ctx.fill();
  
  // Add temperature text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${temperature}°`, 20, 25);
  
  return canvas.toDataURL();
}

// Show detailed temperature information for a city
function showCityTemperatureDetails(cityName, temperature, year) {
  const detailModal = document.createElement('div');
  detailModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 25px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 10000;
    max-width: 400px;
    width: 90%;
    text-align: center;
  `;
  
  // Get additional data for the city
  const tempData = getCurrentTemperatureData(year);
  
  detailModal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 1.8em;">🏙️ ${cityName}</h2>
      <p style="margin: 5px 0; opacity: 0.9;">Climate Data for ${year}</p>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 15px 0;">
      <div style="font-size: 3em; margin: 10px 0; color: #FFD700;">${temperature}°C</div>
      <div style="font-size: 1.1em; margin-bottom: 10px;">Average Temperature</div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
        <div style="font-size: 1.5em; color: #FF6B6B;">🔥</div>
        <div style="font-size: 1.2em; font-weight: bold;">${tempData.heatDays}</div>
        <div style="font-size: 0.9em; opacity: 0.8;">Heat Days</div>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
        <div style="font-size: 1.5em; color: #4ECDC4;">🌧️</div>
        <div style="font-size: 1.2em; font-weight: bold;">${tempData.rainfall}mm</div>
        <div style="font-size: 0.9em; opacity: 0.8;">Rainfall</div>
      </div>
    </div>
    
    <button onclick="this.parentElement.remove()" 
            style="background: #4ECDC4; color: white; border: none; padding: 12px 25px; border-radius: 25px; cursor: pointer; font-weight: bold; margin-top: 15px;">
      Close Details
    </button>
  `;
  
  document.body.appendChild(detailModal);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (detailModal.parentElement) {
      detailModal.remove();
    }
  }, 8000);
}

function jumpToDecade(decade) {
  const yearSlider = document.getElementById('year-slider');
  const selectedYearDisplay = document.getElementById('selected-year');
  
  if (yearSlider && selectedYearDisplay) {
    const targetYear = decade + 5; // Middle of decade
    yearSlider.value = targetYear;
    selectedYearDisplay.textContent = targetYear;
    selectedYear = targetYear;
    
    // Update main map
    loadVisualization(targetYear);
    
    // Update immersive view
    setTimeout(() => {
      showImmersiveView();
    }, 500);
  }
}

function startImmersiveTimelapse() {
  // Close immersive view and start main timelapse
  hideImmersiveView();
  setTimeout(() => {
    startTimelapse();
  }, 300);
}

function toggleImmersiveMode(mode) {
  const immersiveMapElement = document.getElementById('immersive-map');
  if (!immersiveMapElement) {
    console.error('Immersive map element not found');
    return;
  }
  
  console.log(`🎬 Switching immersive view to ${mode} mode`);
  
  // Add visual feedback
  const controlBtns = document.querySelectorAll('.control-btn');
  controlBtns.forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  // Get the immersive map instance (we need to store it globally)
  if (window.immersiveMapInstance) {
    const map = window.immersiveMapInstance;
    
    switch(mode) {
      case '3d':
        map.setOptions({
          mapTypeId: 'terrain',
          tilt: 45,
          heading: 0,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ saturation: 20 }, { lightness: -5 }]
            }
          ]
        });
        showStatusMessage('🏔️ Switched to 3D Terrain View');
        break;
        
      case 'satellite':
        map.setOptions({
          mapTypeId: 'satellite',
          tilt: 0,
          styles: []
        });
        showStatusMessage('🛰️ Switched to Satellite View');
        break;
        
      case 'heatmap':
        map.setOptions({
          mapTypeId: 'terrain',
          tilt: 0,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ saturation: -100 }, { lightness: -20 }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#000000' }]
            }
          ]
        });
        showStatusMessage('🌡️ Switched to Heat Map Mode');
        break;
        
      default:
        console.warn(`Unknown mode: ${mode}`);
    }
  } else {
    console.warn('Immersive map instance not available');
  }
}

function showClimateComparison() {
  const currentYear = parseInt(document.getElementById('year-slider').value);
  const compareYear = currentYear - 20; // Compare with 20 years ago
  
  // Create comparison modal
  const comparisonModal = document.createElement('div');
  comparisonModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 10000;
    max-width: 500px;
    width: 90%;
  `;
  
  const currentTemp = getCurrentTemperatureData(currentYear);
  const compareTemp = getCurrentTemperatureData(compareYear);
  const tempDiff = (currentTemp.avg - compareTemp.avg).toFixed(1);
  
  comparisonModal.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 1.5em;">📊 Climate Comparison</h2>
      <p style="margin: 10px 0; opacity: 0.9;">${compareYear} vs ${currentYear}</p>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
      <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
        <h3 style="margin: 0; color: #74b9ff;">${compareYear}</h3>
        <div style="font-size: 2em; margin: 10px 0; color: #00b894;">${compareTemp.avg}°C</div>
        <div style="font-size: 0.9em; opacity: 0.8;">${compareTemp.heatDays} heat days</div>
      </div>
      
      <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px;">
        <h3 style="margin: 0; color: #74b9ff;">${currentYear}</h3>
        <div style="font-size: 2em; margin: 10px 0; color: #ff6b35;">${currentTemp.avg}°C</div>
        <div style="font-size: 0.9em; opacity: 0.8;">${currentTemp.heatDays} heat days</div>
      </div>
    </div>
    
    <div style="text-align: center; padding: 15px; background: rgba(255,107,53,0.2); border-radius: 10px; margin: 20px 0;">
      <div style="font-size: 1.2em; font-weight: bold;">
        ${tempDiff > 0 ? '🔥' : '❄️'} Temperature Change: ${tempDiff > 0 ? '+' : ''}${tempDiff}°C
      </div>
      <div style="font-size: 0.9em; margin-top: 5px; opacity: 0.9;">
        ${tempDiff > 0 ? 'Warming trend detected' : 'Cooling trend detected'}
      </div>
    </div>
    
    <div style="text-align: center;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: #74b9ff; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold;">
        Close Comparison
      </button>
    </div>
  `;
  
  document.body.appendChild(comparisonModal);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (comparisonModal.parentElement) {
      comparisonModal.remove();
    }
  }, 10000);
}

function showStatusMessage(message) {
  // Create status message
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    z-index: 10001;
    font-weight: bold;
    backdrop-filter: blur(10px);
  `;
  statusDiv.textContent = message;
  
  document.body.appendChild(statusDiv);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (statusDiv.parentElement) {
      statusDiv.remove();
    }
  }, 3000);
}

function hideImmersiveView() {
  const immersiveOverlay = document.getElementById('immersive-overlay');
  if (immersiveOverlay) {
    immersiveOverlay.classList.add('hidden');
  }
}

// Show loading spinner
function showLoadingSpinner() {
  console.log("Showing loading spinner");
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.remove('hidden');
    // Ensure the spinner is visible by removing any inline display style
    spinner.style.display = '';
    console.log("Loading spinner shown successfully");
  } else {
    console.error("Loading spinner element not found!");
  }
}

// Hide loading spinner
function hideLoadingSpinner() {
  console.log("Hiding loading spinner");
  debugSpinnerState(); // Debug before hiding
  
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    // Multiple approaches to ensure the spinner is hidden
    spinner.classList.add('hidden');
    spinner.style.display = 'none';
    spinner.style.visibility = 'hidden';
    spinner.style.opacity = '0';
    
    // Force DOM reflow
    spinner.offsetHeight;
    
    console.log("Loading spinner hidden successfully");
    
    // Debug after hiding
    setTimeout(() => {
      debugSpinnerState();
    }, 100);
  } else {
    console.error("Loading spinner element not found!");
  }
  
  // Also reset the loading state
  isLoading = false;
}

// Debug function to check spinner state
function debugSpinnerState() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    console.log("=== SPINNER DEBUG INFO ===");
    console.log("- Element exists:", !!spinner);
    console.log("- Classes:", spinner.className);
    console.log("- Style display:", spinner.style.display);
    console.log("- Computed display:", window.getComputedStyle(spinner).display);
    console.log("- Computed visibility:", window.getComputedStyle(spinner).visibility);
    console.log("- Has 'hidden' class:", spinner.classList.contains('hidden'));
    console.log("- isLoading state:", isLoading);
    console.log("========================");
  } else {
    console.error("Spinner element not found for debugging!");
  }
}

// Show error message
function showError(message) {
  console.error("Showing error:", message);
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  
  if (errorMessage && errorText) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
  } else {
    console.error("Error message elements not found!");
    alert('Error: ' + message);
  }
}

// Make debug and utility functions available globally for troubleshooting
if (typeof window !== 'undefined') {
  window.debugSpinnerState = debugSpinnerState;
  window.hideLoadingSpinner = hideLoadingSpinner;
  window.showLoadingSpinner = showLoadingSpinner;
  window.analyzeEarthEngineData = analyzeEarthEngineData;
}

// Enhanced bulk loading with all data types
function startBulkLoading() {
  const startYear = parseInt(document.getElementById('start-year').value);
  const endYear = parseInt(document.getElementById('end-year').value);
  
  if (startYear >= endYear) {
    alert('Start year must be less than end year');
    return;
  }

  const loadingSection = document.getElementById('loading-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressPercentage = document.getElementById('progress-percentage');
  const progressStatus = document.getElementById('progress-status');
  
  loadingSection.classList.remove('hidden');
  document.getElementById('load-all-data-btn').disabled = true;

  // Enhanced loading with multiple data types
  const dataTypes = ['temperature', 'weather', 'anomaly', 'terrain'];
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  
  const totalOperations = years.length * dataTypes.length;
  let completedOperations = 0;
  let currentYear = startYear;
  let currentDataTypeIndex = 0;
  
  console.log(`🚀 Starting enhanced bulk loading: ${years.length} years × ${dataTypes.length} data types = ${totalOperations} operations`);
  
  // Update progress display
  function updateProgress(year, dataType, success = true) {
    completedOperations++;
    const progress = Math.round((completedOperations / totalOperations) * 100);
    
    progressFill.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;
    progressStatus.textContent = `${success ? '✅' : '❌'} ${year} ${dataType} (${completedOperations}/${totalOperations})`;
    
    console.log(`📊 Progress: ${progress}% - ${year} ${dataType} ${success ? 'completed' : 'failed'}`);
  }
  
  // Load single data type for a year
  async function loadDataType(year, dataType) {
    const endpoints = {
      temperature: `/ee-temp-layer?year=${year}`,
      weather: `/ee-weather-layer?year=${year}`,
      anomaly: `/ee-anomaly-layer?year=${year}`,
      terrain: `/ee-terrain-layer?year=${year}`
    };
    
    try {
      console.log(`🔄 Loading ${dataType} for year ${year}...`);
      const response = await fetch(endpoints[dataType]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Store in appropriate cache
        cachedVisualizationData[dataType][year] = data;
        
        // Also store in timelapseData for backward compatibility (temperature only)
        if (dataType === 'temperature') {
          timelapseData[year] = {
            mapid: data.mapid,
            token: data.token || '',
            year: year,
            dataType: 'temperature',
            urlFormat: data.urlFormat
          };
        }
        
        updateProgress(year, dataType, true);
        return true;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`❌ Failed to load ${dataType} for year ${year}:`, error.message);
      updateProgress(year, dataType, false);
      return false;
    }
  }
  
  // Sequential loading to avoid overwhelming the server
  async function loadAllData() {
    for (const year of years) {
      for (const dataType of dataTypes) {
        await loadDataType(year, dataType);
        
        // Small delay to prevent server overload
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Completion
    document.getElementById('load-all-data-btn').disabled = false;
    
    // Update slider range
    document.getElementById('year-slider').min = startYear;
    document.getElementById('year-slider').max = endYear;
    
    const successfulYears = Object.keys(timelapseData).length;
    progressStatus.textContent = `🎉 Complete! Loaded ${successfulYears} years with all data types`;
    
    const cacheStats = {
      temperature: Object.keys(cachedVisualizationData.temperature).length,
      weather: Object.keys(cachedVisualizationData.weather).length,
      anomaly: Object.keys(cachedVisualizationData.anomaly).length,
      terrain: Object.keys(cachedVisualizationData.terrain).length,
      timelapseCompatible: Object.keys(timelapseData).length
    };
    
    console.log('📊 All data cached:', cacheStats);
    
    // Update cache status display
    updateCacheStatusDisplay();
    
    // Initialize the new user-controlled time-lapse system
    setTimeout(() => {
      loadingSection.classList.add('hidden');
      
      // Initialize time-lapse with cached data
      if (initializeTimelapse()) {
        showStatusMessage('🎬 Time-lapse ready! All visualization modes cached and available.');
      }
    }, 2000);
  }
  
  // Start the loading process
  loadAllData().catch(error => {
    console.error('Bulk loading failed:', error);
    document.getElementById('load-all-data-btn').disabled = false;
    progressStatus.textContent = `❌ Loading failed: ${error.message}`;
  });
}

// Display cached year data with proper tile loading detection
function displayCachedYear(year) {
  return new Promise((resolve, reject) => {
    console.log(`🎬 [TIMELAPSE] Starting display for year ${year}`);
    
    const data = timelapseData[year];
    if (!data) {
      console.error(`❌ [TIMELAPSE] No cached data for year ${year}`);
      resolve();
      return;
    }
    
    console.log(`✅ [TIMELAPSE] Found cached data for year ${year}`);
    
    // Remove previous overlay
    if (currentOverlay) {
      console.log(`🗑️ [TIMELAPSE] Removing previous overlay`);
      map.overlayMapTypes.clear();
      currentOverlay = null;
    }
    
    // Track tile loading
    let tilesRequested = 0;
    let tilesLoaded = 0;
    let tilesErrored = 0;
    let loadingStarted = false;
    let resolved = false;
    
    // Create tile URL function with loading tracking
    const getTileUrlFunction = function(tile, zoom) {
      tilesRequested++;
      loadingStarted = true;
      
      let url;
      if (data.urlFormat) {
        url = data.urlFormat
          .replace('{z}', zoom)
          .replace('{x}', tile.x)
          .replace('{y}', tile.y);
      } else {
        const baseUrl = `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}`;
        const token = data.token ? `?token=${data.token}` : '';
        const cacheBuster = `${token ? '&' : '?'}cb=${Date.now()}&year=${year}`;
        url = `${baseUrl}${token}${cacheBuster}`;
      }
      
      console.log(`🔗 [TIMELAPSE] Tile ${tilesRequested} requested for year ${year}: ${tile.x},${tile.y},${zoom}`);
      
      // Test if tile loads by creating an image
      const testImg = new Image();
      testImg.onload = function() {
        tilesLoaded++;
        console.log(`✅ [TIMELAPSE] Tile loaded for year ${year}: ${tilesLoaded}/${tilesRequested}`);
        checkTileLoadingComplete();
      };
      testImg.onerror = function() {
        tilesErrored++;
        console.log(`❌ [TIMELAPSE] Tile error for year ${year}: ${tilesErrored}/${tilesRequested}`);
        checkTileLoadingComplete();
      };
      testImg.src = url;
      
      return url;
    };
    
    // Check if all tiles are loaded
    function checkTileLoadingComplete() {
      const totalProcessed = tilesLoaded + tilesErrored;
      console.log(`📊 [TIMELAPSE] Year ${year} tile status: ${totalProcessed}/${tilesRequested} (${tilesLoaded} loaded, ${tilesErrored} errors)`);
      
      if (totalProcessed >= tilesRequested && tilesRequested > 0 && !resolved) {
        resolved = true;
        console.log(`🎉 [TIMELAPSE] All tiles processed for year ${year}, resolving`);
        resolve();
      }
    }
    
    // Create tile source
    const tileSource = new google.maps.ImageMapType({
      name: `Temperature ${year}`,
      getTileUrl: getTileUrlFunction,
      tileSize: new google.maps.Size(256, 256),
      minZoom: 1,
      maxZoom: 20,
      opacity: 0.7
    });
    
    console.log(`🗺️ [TIMELAPSE] Created tile source for year ${year}`);
    
    // Add to map
    map.overlayMapTypes.push(tileSource);
    currentOverlay = tileSource;
    
    console.log(`📍 [TIMELAPSE] Added overlay to map for year ${year}`);
    
    // Update UI immediately
    document.getElementById('selected-year').textContent = year;
    document.getElementById('year-slider').value = year;
    
    // Force map refresh to trigger tile loading
    setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
      map.setZoom(map.getZoom());
      console.log(`🔄 [TIMELAPSE] Triggered map refresh for year ${year}`);
    }, 100);
    
    // Fallback timeout - wait up to 10 seconds for tiles
    const fallbackTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`⏰ [TIMELAPSE] Timeout reached for year ${year} (${tilesLoaded}/${tilesRequested} tiles loaded)`);
        resolve();
      }
    }, 10000); // 10 second maximum wait
    
    // If no tiles are requested within 3 seconds, assume viewport issue and continue
    setTimeout(() => {
      if (!loadingStarted && !resolved) {
        resolved = true;
        console.log(`⚠️ [TIMELAPSE] No tiles requested for year ${year}, continuing`);
        resolve();
      }
    }, 3000);
  });
}

// User-controlled time-lapse navigation system
function initializeTimelapse() {
  console.log('🎬 [TIMELAPSE] Initializing user-controlled time-lapse...');
  
  if (Object.keys(timelapseData).length === 0) {
    console.error('❌ [TIMELAPSE] No cached data available');
    alert('Please load data first using "Load All Historical Data" button');
    return false;
  }
  
  // Get sorted years from cached data
  timelapseYears = Object.keys(timelapseData).map(Number).sort((a, b) => a - b);
  
  if (timelapseYears.length === 0) {
    console.error('❌ [TIMELAPSE] No valid years found in cached data');
    alert('No cached data available for time-lapse');
    return false;
  }
  
  // Initialize at first year
  currentYearIndex = 0;
  currentTimelapseYear = timelapseYears[0];
  isTimelapseActive = true;
  
  // Populate year dropdown
  populateYearDropdown();
  
  // Show time-lapse controls
  document.getElementById('timelapse-controls').classList.remove('hidden');
  
  // Update UI
  updateTimelapseUI();
  
  // Load first year
  displayCachedYear(currentTimelapseYear);
  
  console.log(`✅ [TIMELAPSE] Initialized with ${timelapseYears.length} years (${timelapseYears[0]}-${timelapseYears[timelapseYears.length-1]})`);
  return true;
}

function populateYearDropdown() {
  const dropdown = document.getElementById('timelapse-jump-year');
  if (!dropdown) return;
  
  // Clear existing options except the first one
  dropdown.innerHTML = '<option value="">Select Year...</option>';
  
  // Add all available years
  timelapseYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    dropdown.appendChild(option);
  });
}

function updateTimelapseUI() {
  // Update year display
  const yearDisplay = document.getElementById('timelapse-current-year');
  if (yearDisplay) {
    yearDisplay.textContent = currentTimelapseYear;
  }
  
  // Update progress
  const yearIndex = document.getElementById('timelapse-year-index');
  const totalYears = document.getElementById('timelapse-total-years');
  if (yearIndex && totalYears) {
    yearIndex.textContent = currentYearIndex + 1;
    totalYears.textContent = timelapseYears.length;
  }
  
  // Update button states
  const startBtn = document.getElementById('timelapse-start-btn');
  const prevBtn = document.getElementById('timelapse-prev-btn');
  const nextBtn = document.getElementById('timelapse-next-btn');
  const endBtn = document.getElementById('timelapse-end-btn');
  
  if (startBtn) startBtn.disabled = currentYearIndex === 0;
  if (prevBtn) prevBtn.disabled = currentYearIndex === 0;
  if (nextBtn) nextBtn.disabled = currentYearIndex === timelapseYears.length - 1;
  if (endBtn) endBtn.disabled = currentYearIndex === timelapseYears.length - 1;
}

function navigateToYear(direction) {
  if (!isTimelapseActive || timelapseYears.length === 0) {
    console.warn('Time-lapse not active or no data available');
    return;
  }
  
  let newIndex = currentYearIndex;
  
  switch(direction) {
    case 'first':
      newIndex = 0;
      break;
    case 'prev':
      newIndex = Math.max(0, currentYearIndex - 1);
      break;
    case 'next':
      newIndex = Math.min(timelapseYears.length - 1, currentYearIndex + 1);
      break;
    case 'last':
      newIndex = timelapseYears.length - 1;
      break;
    default:
      // Direct year navigation
      if (typeof direction === 'number') {
        const yearIndex = timelapseYears.indexOf(direction);
        if (yearIndex !== -1) {
          newIndex = yearIndex;
        } else {
          console.warn(`Year ${direction} not found in cached data`);
          return;
        }
      }
  }
  
  if (newIndex !== currentYearIndex) {
    currentYearIndex = newIndex;
    currentTimelapseYear = timelapseYears[currentYearIndex];
    
    console.log(`🎯 [TIMELAPSE] Navigating to year ${currentTimelapseYear} (${currentYearIndex + 1}/${timelapseYears.length})`);
    
    // Update UI
    updateTimelapseUI();
    
    // Load the year data
    displayCachedYear(currentTimelapseYear);
    
    // Show status message
    showStatusMessage(`📅 Year ${currentTimelapseYear} (${currentYearIndex + 1}/${timelapseYears.length})`);
  }
}

function exitTimelapse() {
  console.log('❌ [TIMELAPSE] Exiting time-lapse mode');
  
  isTimelapseActive = false;
  
  // Hide time-lapse controls
  document.getElementById('timelapse-controls').classList.add('hidden');
  
  // Return to normal year slider
  const yearSlider = document.getElementById('year-slider');
  const selectedYearDisplay = document.getElementById('selected-year');
  
  if (yearSlider && selectedYearDisplay) {
    yearSlider.value = currentTimelapseYear;
    selectedYearDisplay.textContent = currentTimelapseYear;
    selectedYear = currentTimelapseYear;
  }
  
  showStatusMessage('🏠 Returned to normal mode');
}

// Auto-play functionality (optional)
let autoPlayInterval = null;

function startAutoPlay() {
  if (autoPlayInterval) {
    stopAutoPlay();
    return;
  }
  
  const autoPlayBtn = document.getElementById('timelapse-auto-play-btn');
  if (autoPlayBtn) {
    autoPlayBtn.textContent = '⏸️ Stop Auto';
  }
  
  autoPlayInterval = setInterval(() => {
    if (currentYearIndex < timelapseYears.length - 1) {
      navigateToYear('next');
    } else {
      // Reached the end, stop auto-play
      stopAutoPlay();
    }
  }, 2000); // 2 seconds per year
  
  showStatusMessage('▶️ Auto-play started');
}

function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }
  
  const autoPlayBtn = document.getElementById('timelapse-auto-play-btn');
  if (autoPlayBtn) {
    autoPlayBtn.textContent = '🎬 Auto Play';
  }
  
  showStatusMessage('⏸️ Auto-play stopped');
}

// Quick range selection functions
function setQuickRange(startYear, endYear) {
  document.getElementById('start-year').value = startYear;
  document.getElementById('end-year').value = endYear;
  
  showStatusMessage(`📅 Range set to ${startYear}-${endYear} (${endYear - startYear + 1} years)`);
}

// Update cache status display
function updateCacheStatusDisplay() {
  const cacheStatus = document.getElementById('cache-status');
  if (!cacheStatus) return;
  
  // Show the cache status panel
  cacheStatus.classList.remove('hidden');
  
  // Update individual counts
  document.getElementById('cache-temp-count').textContent = Object.keys(cachedVisualizationData.temperature).length;
  document.getElementById('cache-weather-count').textContent = Object.keys(cachedVisualizationData.weather).length;
  document.getElementById('cache-anomaly-count').textContent = Object.keys(cachedVisualizationData.anomaly).length;
  document.getElementById('cache-terrain-count').textContent = Object.keys(cachedVisualizationData.terrain).length;
  
  // Calculate total operations
  const totalOperations = Object.keys(cachedVisualizationData.temperature).length +
                          Object.keys(cachedVisualizationData.weather).length +
                          Object.keys(cachedVisualizationData.anomaly).length +
                          Object.keys(cachedVisualizationData.terrain).length;
  
  document.getElementById('cache-total-operations').textContent = totalOperations;
  
  console.log('📊 Cache status updated:', {
    temperature: Object.keys(cachedVisualizationData.temperature).length,
    weather: Object.keys(cachedVisualizationData.weather).length,
    anomaly: Object.keys(cachedVisualizationData.anomaly).length,
    terrain: Object.keys(cachedVisualizationData.terrain).length,
    total: totalOperations
  });
}

// Make functions globally available
window.setQuickRange = setQuickRange;

// Debug function to check cached data
window.debugTimelapseCache = function() {
  console.log(`📊 [DEBUG] Cached timelapse data:`, timelapseData);
  console.log(`📊 [DEBUG] Number of cached years:`, Object.keys(timelapseData).length);
  console.log(`📊 [DEBUG] Available years:`, Object.keys(timelapseData).map(Number).sort((a, b) => a - b));
  
  // Check data structure for each year
  Object.keys(timelapseData).forEach(year => {
    const data = timelapseData[year];
    console.log(`📊 [DEBUG] Year ${year}:`, {
      hasMapid: !!data.mapid,
      hasToken: !!data.token,
      hasUrlFormat: !!data.urlFormat,
      dataType: data.dataType
    });
  });
};

// Add temperature legend to the map
function addTemperatureLegend() {
  const legend = document.createElement('div');
  legend.id = 'temp-legend';
  legend.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255,255,255,0.9);
    padding: 10px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    z-index: 1000;
  `;
  
  legend.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Temperature (°C)</div>
    <div style="display: flex; align-items: center;">
      <div style="width: 200px; height: 20px; background: linear-gradient(to right, 
        #000080, #0000d9, #4000ff, #8000ff, #0080ff, #00ffff, 
        #00ff80, #80ff00, #daff00, #ffff00, #fff500, #ffda00, 
        #ffb000, #ffa400, #ff4f00, #ff2500, #ff0a00, #ff00ff); 
        border: 1px solid #ccc;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
      <span>25°C</span>
      <span>27.5°C</span>
      <span>30°C</span>
    </div>
    <div style="font-size: 10px; color: #666; margin-top: 3px;">
      High contrast: 5°C range for detailed variations
    </div>
  `;
  
  document.getElementById('map').appendChild(legend);
}

// Enhanced visualization modes
// Variables already declared at the top of the file
// let currentVisualizationMode = 'temperature'; // 'temperature', 'weather', 'anomaly', 'terrain'
// let windLayer = null;

// Add visualization mode selector
function addVisualizationControls() {
  const controls = document.createElement('div');
  controls.id = 'viz-controls';
  controls.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255,255,255,0.9);
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    font-family: Arial, sans-serif;
  `;
  
  controls.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">🎨 Visualization Mode</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="radio" name="vizMode" value="temperature" checked style="margin-right: 8px;">
        🌡️ Temperature Only
      </label>
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="radio" name="vizMode" value="weather" style="margin-right: 8px;">
        🌪️ Temperature + Wind
      </label>
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="radio" name="vizMode" value="anomaly" style="margin-right: 8px;">
        📊 Temperature Anomaly
      </label>
      <label style="display: flex; align-items: center; cursor: pointer;">
        <input type="radio" name="vizMode" value="terrain" style="margin-right: 8px;">
        🏔️ 3D Terrain View
      </label>
    </div>
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
      <div style="font-weight: bold; margin-bottom: 10px;">🎬 Experience Mode</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="immersive-mode-toggle" style="margin-right: 8px;">
          ✨ Enhanced Immersive Mode
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="particle-effects-toggle" style="margin-right: 8px;">
          🌟 Temperature Particles
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="smooth-transitions-toggle" checked style="margin-right: 8px;">
          🎭 Smooth Transitions
        </label>
      </div>
    </div>
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
      <div style="font-weight: bold; margin-bottom: 10px;">🎚️ Visual Settings</div>
      <div style="margin-bottom: 8px;">
        <label style="font-size: 0.9em; display: block; margin-bottom: 4px;">Opacity:</label>
        <input type="range" id="opacity-slider" min="0.3" max="1" step="0.1" value="0.7" style="width: 100%;">
      </div>
      <div style="margin-bottom: 8px;">
        <label style="font-size: 0.9em; display: block; margin-bottom: 4px;">Intensity:</label>
        <input type="range" id="intensity-slider" min="0.5" max="2" step="0.1" value="1" style="width: 100%;">
      </div>
    </div>
  `;
  
  document.getElementById('map').appendChild(controls);
  
  // Add event listeners for visualization modes
  const radios = controls.querySelectorAll('input[name="vizMode"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentVisualizationMode = e.target.value;
      const currentYear = parseInt(document.getElementById('year-slider').value);
      loadVisualization(currentYear);
    });
  });
  
  // Add event listeners for enhanced controls
  const immersiveModeToggle = controls.querySelector('#immersive-mode-toggle');
  if (immersiveModeToggle) {
    immersiveModeToggle.addEventListener('change', (e) => {
      isImmersiveMode = e.target.checked;
      toggleMapImmersiveMode(isImmersiveMode);
    });
  }
  
  const particleEffectsToggle = controls.querySelector('#particle-effects-toggle');
  if (particleEffectsToggle) {
    particleEffectsToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        startTemperatureParticles();
      } else {
        stopTemperatureParticles();
      }
    });
  }
  
  const opacitySlider = controls.querySelector('#opacity-slider');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      updateVisualizationOpacity(parseFloat(e.target.value));
    });
  }
  
  const intensitySlider = controls.querySelector('#intensity-slider');
  if (intensitySlider) {
    intensitySlider.addEventListener('input', (e) => {
      updateVisualizationIntensity(parseFloat(e.target.value));
    });
  }
}

// Enhanced visualization functions
function toggleMapImmersiveMode(enabled) {
  if (!map) return;
  
  if (enabled) {
    // Enable immersive mode with enhanced styling
    map.setOptions({
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ saturation: -20 }, { lightness: -10 }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#1a237e' }, { saturation: 30 }]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#2e2e2e' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ visibility: 'simplified' }, { color: '#444444' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeId: 'terrain'
    });
    
    // Add atmospheric effects
    addAtmosphericEffects();
  } else {
    // Disable immersive mode - return to normal styling
    map.setOptions({
      styles: [],
      mapTypeId: 'terrain'
    });
    
    removeAtmosphericEffects();
  }
}

function startTemperatureParticles() {
  if (!map) return;
  
  // Create particle overlay
  const particleOverlay = document.createElement('canvas');
  particleOverlay.id = 'temperature-particles';
  particleOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  `;
  
  const mapDiv = document.getElementById('map');
  mapDiv.appendChild(particleOverlay);
  
  // Initialize particle system
  initializeParticleSystem(particleOverlay);
}

function stopTemperatureParticles() {
  const particleCanvas = document.getElementById('temperature-particles');
  if (particleCanvas) {
    particleCanvas.remove();
  }
  
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  temperatureParticles = [];
}

function initializeParticleSystem(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  // Get current year and fetch real temperature data for particles
  const currentYear = parseInt(document.getElementById('year-slider').value);
  
  // Create temperature particles with real Earth Engine data
  createRealTemperatureParticles(canvas.width, canvas.height, currentYear);
  
  // Start animation
  animateParticles(ctx, canvas);
}

// Create particles based on real Earth Engine temperature data
async function createRealTemperatureParticles(width, height, year) {
  try {
    // Fetch temperature data for specific locations in Uttar Pradesh
    const response = await fetch(`/ee-temp-points?year=${year}`);
    const data = await response.json();
    
    if (data.success && data.temperaturePoints) {
      // Use real temperature data
      temperatureParticles = data.temperaturePoints.map((point, index) => ({
        x: (point.longitude - 77) * (width / 6) + width * 0.3, // Convert lon to screen x
        y: (28 - point.latitude) * (height / 6) + height * 0.3, // Convert lat to screen y
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        size: Math.max(2, Math.min(6, point.temperature / 8)), // Size based on temperature
        opacity: Math.max(0.3, Math.min(0.8, point.temperature / 50)),
        temperature: point.temperature, // REAL EARTH ENGINE DATA
        location: point.location || `Point ${index + 1}`
      }));
    } else {
      // Fallback to enhanced simulated data based on real patterns
      createEnhancedSimulatedParticles(width, height, year);
    }
  } catch (error) {
    console.error('Failed to fetch real temperature data for particles:', error);
    createEnhancedSimulatedParticles(width, height, year);
  }
}

// Enhanced simulated particles based on real climate patterns
function createEnhancedSimulatedParticles(width, height, year) {
  // Real locations in Uttar Pradesh with realistic temperature variations
  const upLocations = [
    { name: 'Lucknow', lat: 26.8467, lon: 80.9462, baseTemp: 26.5 },
    { name: 'Kanpur', lat: 26.4499, lon: 80.3319, baseTemp: 27.2 },
    { name: 'Agra', lat: 27.1767, lon: 78.0081, baseTemp: 26.8 },
    { name: 'Varanasi', lat: 25.3176, lon: 82.9739, baseTemp: 26.9 },
    { name: 'Allahabad', lat: 25.4358, lon: 81.8463, baseTemp: 26.7 },
    { name: 'Meerut', lat: 28.9845, lon: 77.7064, baseTemp: 25.8 },
    { name: 'Bareilly', lat: 28.3670, lon: 79.4304, baseTemp: 25.9 },
    { name: 'Gorakhpur', lat: 26.7606, lon: 83.3732, baseTemp: 26.4 }
  ];
  
  temperatureParticles = upLocations.map((location, index) => {
    // Calculate realistic temperature based on year and location
    const yearOffset = (year - 1980) * 0.03; // 0.03°C increase per year
    const seasonalVariation = Math.sin((index / upLocations.length) * Math.PI * 2) * 3; // ±3°C seasonal
    const urbanHeatIsland = location.name === 'Lucknow' || location.name === 'Kanpur' ? 1.5 : 0;
    
    const realTemp = location.baseTemp + yearOffset + seasonalVariation + urbanHeatIsland;
    
    return {
      x: ((location.lon - 77) / 6) * width + width * 0.3,
      y: ((28 - location.lat) / 6) * height + height * 0.3,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: Math.max(2, Math.min(6, realTemp / 8)),
      opacity: Math.max(0.3, Math.min(0.8, realTemp / 50)),
      temperature: realTemp,
      location: location.name
    };
  });
  
  // Add some additional random particles for visual effect
  for (let i = 0; i < 20; i++) {
    const baseTemp = 26 + (year - 1980) * 0.03;
    const randomTemp = baseTemp + (Math.random() - 0.5) * 8;
    
    temperatureParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: Math.max(1, Math.min(4, randomTemp / 10)),
      opacity: Math.random() * 0.4 + 0.2,
      temperature: randomTemp,
      location: 'Regional'
    });
  }
}

function animateParticles(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  temperatureParticles.forEach(particle => {
    // Update position with slower movement for better visibility
    particle.x += particle.vx * 0.5;
    particle.y += particle.vy * 0.5;
    
    // Wrap around edges
    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;
    
    // Enhanced color mapping based on temperature
    let hue, saturation, lightness;
    if (particle.temperature < 20) {
      // Cold: Blue tones
      hue = 240;
      saturation = 80;
      lightness = 60;
    } else if (particle.temperature < 30) {
      // Moderate: Green to yellow
      hue = 120 - ((particle.temperature - 20) / 10) * 60; // 120 to 60
      saturation = 70;
      lightness = 55;
    } else if (particle.temperature < 40) {
      // Warm: Yellow to orange
      hue = 60 - ((particle.temperature - 30) / 10) * 30; // 60 to 30
      saturation = 85;
      lightness = 50;
    } else {
      // Hot: Red tones
      hue = 0;
      saturation = 90;
      lightness = 45;
    }
    
    // Draw particle with glow effect
    ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.shadowBlur = particle.size * 2;
    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${particle.opacity})`;
    
    // Draw main particle
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw temperature label for larger particles (city locations)
    if (particle.size > 3 && particle.location !== 'Regional') {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      
      // Temperature value
      const tempText = `${particle.temperature.toFixed(1)}°C`;
      ctx.fillText(tempText, particle.x, particle.y - particle.size - 5);
      
      // Location name (smaller font)
      if (particle.location) {
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(particle.location, particle.x, particle.y + particle.size + 12);
      }
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
  });
  
  // Add legend for temperature particles
  drawParticleLegend(ctx, canvas);
  
  animationFrame = requestAnimationFrame(() => animateParticles(ctx, canvas));
}

// Draw a legend for temperature particles
function drawParticleLegend(ctx, canvas) {
  const legendX = canvas.width - 150;
  const legendY = 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(legendX - 10, legendY - 10, 140, 80);
  
  // Title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Temperature Particles', legendX, legendY + 5);
  
  // Temperature ranges
  const ranges = [
    { temp: '<20°C', color: 'hsl(240, 80%, 60%)', label: 'Cold' },
    { temp: '20-30°C', color: 'hsl(90, 70%, 55%)', label: 'Moderate' },
    { temp: '30-40°C', color: 'hsl(45, 85%, 50%)', label: 'Warm' },
    { temp: '>40°C', color: 'hsl(0, 90%, 45%)', label: 'Hot' }
  ];
  
  ranges.forEach((range, index) => {
    const y = legendY + 20 + index * 12;
    
    // Color dot
    ctx.fillStyle = range.color;
    ctx.beginPath();
    ctx.arc(legendX + 5, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.fillText(`${range.temp} ${range.label}`, legendX + 15, y + 3);
  });
}

function updateVisualizationOpacity(opacity) {
  if (currentOverlay && map) {
    // Update overlay opacity
    const overlays = map.overlayMapTypes.getArray();
    overlays.forEach(overlay => {
      if (overlay.setOpacity) {
        overlay.setOpacity(opacity);
      }
    });
  }
}

function updateVisualizationIntensity(intensity) {
  // This would adjust the color intensity of the visualization
  console.log(`Updating visualization intensity to ${intensity}`);
  // Implementation would depend on the specific visualization type
}

function addAtmosphericEffects() {
  // Add subtle atmospheric effects to enhance immersion
  const mapDiv = document.getElementById('map');
  
  // Add a subtle overlay for atmospheric effect
  const atmosphereOverlay = document.createElement('div');
  atmosphereOverlay.id = 'atmosphere-overlay';
  atmosphereOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, transparent 0%, rgba(30, 60, 114, 0.1) 100%);
    pointer-events: none;
    z-index: 2;
  `;
  
  mapDiv.appendChild(atmosphereOverlay);
}

function removeAtmosphericEffects() {
  const atmosphereOverlay = document.getElementById('atmosphere-overlay');
  if (atmosphereOverlay) {
    atmosphereOverlay.remove();
  }
}

// Enhanced legend for different modes
function addEnhancedLegend(mode, year) {
  // Remove existing legend
  const existingLegend = document.getElementById('temp-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  const legend = document.createElement('div');
  legend.id = 'temp-legend';
  legend.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255,255,255,0.9);
    padding: 12px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 1000;
    max-width: 250px;
  `;
  
  let legendContent = '';
  
  switch(mode) {
    case 'temperature':
    case 'weather':
      legendContent = `
        <div style="font-weight: bold; margin-bottom: 8px;">Temperature (°C) - ${year}</div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="width: 200px; height: 20px; background: linear-gradient(to right, 
            blue, cyan, green, yellow, orange, red); border: 1px solid #ccc;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>25°C</span><span>27.5°C</span><span>30°C</span>
        </div>
        ${mode === 'weather' ? '<div style="font-size: 10px; color: #666;">+ Animated wind streamlines</div>' : ''}
      `;
      break;
      
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
      break;
      
    case 'terrain':
      legendContent = `
        <div style="font-weight: bold; margin-bottom: 8px;">3D Temperature - ${year}</div>
        <div style="font-size: 11px; margin-bottom: 8px;">Temperature over topographic relief</div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="width: 200px; height: 20px; background: linear-gradient(to right, 
            blue, cyan, green, yellow, orange, red); border: 1px solid #ccc;"></div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>25°C</span><span>27.5°C</span><span>30°C</span>
        </div>
        <div style="font-size: 10px; color: #666; margin-top: 5px;">
          Hillshade shows elevation and terrain features
        </div>
      `;
      break;
  }
  
  legend.innerHTML = legendContent;
  document.getElementById('map').appendChild(legend);
}

// Enhanced visualization loader with caching support
function loadVisualization(year) {
  // If visualization controls aren't ready yet, fall back to temperature
  if (!currentVisualizationMode || currentVisualizationMode === 'temperature') {
    console.log(`Loading temperature layer for year ${year} (fallback)`);
    loadTemperatureLayer(year);
    return;
  }
  
  if (isLoading) {
    console.log("Already loading, request ignored");
    return;
  }
  
  // Check if data is cached first
  const cachedData = cachedVisualizationData[currentVisualizationMode]?.[year];
  if (cachedData) {
    console.log(`🚀 Using cached ${currentVisualizationMode} data for year ${year}`);
    loadVisualizationFromCache(cachedData, year);
    return;
  }
  
  isLoading = true;
  showLoadingSpinner();
  
  // Clear existing overlays
  if (currentOverlay) {
    map.overlayMapTypes.clear();
    currentOverlay = null;
  }
  
  // Clear wind layer if exists
  if (windLayer) {
    if (windLayer.remove) {
      windLayer.remove();
    } else if (windLayer.parentNode) {
      windLayer.parentNode.removeChild(windLayer);
    }
    windLayer = null;
  }
  
  let endpoint = '';
  switch(currentVisualizationMode) {
    case 'temperature':
      endpoint = `/ee-temp-layer?year=${year}`;
      break;
    case 'weather':
      endpoint = `/ee-weather-layer?year=${year}`;
      break;
    case 'anomaly':
      endpoint = `/ee-anomaly-layer?year=${year}`;
      break;
    case 'terrain':
      endpoint = `/ee-terrain-layer?year=${year}`;
      break;
    default:
      endpoint = `/ee-temp-layer?year=${year}`;
  }
  
  console.log(`🔄 Loading ${currentVisualizationMode} visualization for year ${year} from server...`);
  
  fetch(endpoint)
    .then(response => {
      console.log(`Response status for ${currentVisualizationMode}:`, response.status);
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log(`${currentVisualizationMode} response:`, data);
      
      if (data.success) {
        // Cache the data for future use
        if (!cachedVisualizationData[currentVisualizationMode]) {
          cachedVisualizationData[currentVisualizationMode] = {};
        }
        cachedVisualizationData[currentVisualizationMode][year] = data;
        
        // Load the visualization
        loadVisualizationFromCache(data, year);
      } else {
        throw new Error(data.error || 'Failed to load visualization');
      }
      
      hideLoadingSpinner();
    })
    .catch(error => {
      console.error(`Error loading ${currentVisualizationMode}:`, error);
      hideLoadingSpinner();
      
      // Show specific error message
      showError(`Failed to load ${currentVisualizationMode} for ${year}: ${error.message}`);
      
      // Only fallback to temperature if we're not already trying temperature
      if (currentVisualizationMode !== 'temperature') {
        console.log("Falling back to temperature layer...");
        setTimeout(() => {
          currentVisualizationMode = 'temperature';
          loadTemperatureLayer(year);
        }, 1000);
      }
    })
    .finally(() => {
      isLoading = false;
    });
}

// Load visualization from cached data
function loadVisualizationFromCache(data, year) {
  console.log(`📊 Loading ${currentVisualizationMode} from cache for year ${year}`);
  
  // Clear existing overlays
  if (currentOverlay) {
    map.overlayMapTypes.clear();
    currentOverlay = null;
  }
  
  // Clear wind layer if exists
  if (windLayer) {
    if (windLayer.remove) {
      windLayer.remove();
    } else if (windLayer.parentNode) {
      windLayer.parentNode.removeChild(windLayer);
    }
    windLayer = null;
  }
  
  if (currentVisualizationMode === 'weather') {
    // Handle combined weather data
    loadTemperatureFromData(data.temperature, year);
    if (data.wind) {
      loadWindLayer(data.wind);
    }
  } else {
    // Handle single layer data
    loadTemperatureFromData(data, year);
  }
  
  // Add appropriate legend
  addVisualizationLegend(currentVisualizationMode, year);
  
  // Show cache status
  showStatusMessage(`⚡ Loaded ${currentVisualizationMode} ${year} from cache`);
}

// Load temperature layer from data object
function loadTemperatureFromData(data, year) {
  let getTileUrlFunction;
  
  if (data.urlFormat) {
    console.log(`Using urlFormat for ${currentVisualizationMode}:`, data.urlFormat);
    getTileUrlFunction = function(tile, zoom) {
      const url = data.urlFormat
        .replace('{z}', zoom)
        .replace('{x}', tile.x)
        .replace('{y}', tile.y);
      if (currentVisualizationMode === 'anomaly') {
        console.log(`Anomaly tile URL: ${url}`);
      }
      return url;
    };
  } else {
    console.log(`Using legacy format for ${currentVisualizationMode} with mapid:`, data.mapid);
    getTileUrlFunction = function(tile, zoom) {
      const baseUrl = `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}`;
      const token = data.token ? `?token=${data.token}` : '';
      const cacheBuster = `${token ? '&' : '?'}cb=${Date.now()}&year=${year}`;
      const url = `${baseUrl}${token}${cacheBuster}`;
      if (currentVisualizationMode === 'anomaly') {
        console.log(`Anomaly tile URL: ${url}`);
      }
      return url;
    };
  }
  
  // Set appropriate opacity for different visualization modes
  let opacity = 0.7; // default
  if (currentVisualizationMode === 'weather') {
    opacity = 0.6; // lower for weather to show wind overlay
  } else if (currentVisualizationMode === 'anomaly') {
    opacity = 0.9; // higher for anomaly to make subtle differences visible
  } else if (currentVisualizationMode === 'terrain') {
    opacity = 0.8; // medium for terrain blend
  }
  
  const tileSource = new google.maps.ImageMapType({
    name: `${currentVisualizationMode} ${year}`,
    getTileUrl: getTileUrlFunction,
    tileSize: new google.maps.Size(256, 256),
    minZoom: 1,
    maxZoom: 20,
    opacity: opacity
  });
  
  map.overlayMapTypes.clear();
  map.overlayMapTypes.insertAt(0, tileSource);
  currentOverlay = tileSource;
  
  console.log(`${currentVisualizationMode} layer loaded for year ${year} with opacity ${opacity}`);
  
  // Add specific logging for anomaly
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
}

// Enhanced wind layer loading with tile support
function loadWindLayer(windData) {
  console.log('🌬️ Wind data received:', windData);
  
  // Remove existing wind layer if it exists
  if (windLayer) {
    if (windLayer.setMap) {
      windLayer.setMap(null);
    } else if (windLayer.remove) {
      windLayer.remove();
    } else if (windLayer.parentNode) {
      windLayer.parentNode.removeChild(windLayer);
    }
    windLayer = null;
  }
  
  // Handle different wind data types
  if (windData.type === 'tiles' && windData.mapid) {
    console.log('🗺️ Loading wind as tile overlay...');
    
    // Create tile URL function for wind speed
    let getTileUrlFunction;
    
    if (windData.urlFormat) {
      getTileUrlFunction = function(tile, zoom) {
        const url = windData.urlFormat
          .replace('{z}', zoom)
          .replace('{x}', tile.x)
          .replace('{y}', tile.y);
        console.log(`Wind tile URL: ${url}`);
        return url;
      };
    } else {
      getTileUrlFunction = function(tile, zoom) {
        const baseUrl = `https://earthengine.googleapis.com/map/${windData.mapid}/${zoom}/${tile.x}/${tile.y}`;
        const token = windData.token ? `?token=${windData.token}` : '';
        const cacheBuster = `${token ? '&' : '?'}cb=${Date.now()}&type=wind`;
        const url = `${baseUrl}${token}${cacheBuster}`;
        console.log(`Wind tile URL: ${url}`);
        return url;
      };
    }
    
    // Create the wind tile overlay
    const windTileSource = new google.maps.ImageMapType({
      name: 'Wind Speed',
      getTileUrl: getTileUrlFunction,
      tileSize: new google.maps.Size(256, 256),
      minZoom: 1,
      maxZoom: 20,
      opacity: 0.6  // Semi-transparent to show temperature underneath
    });
    
    // Add wind overlay to map
    console.log('🌬️ Adding wind speed overlay to map');
    map.overlayMapTypes.insertAt(1, windTileSource);  // Layer 1 (above temperature)
    windLayer = windTileSource;
    
    // Add wind legend
    addWindLegend(windData.legend);
    
    showStatusMessage('🌬️ Wind speed overlay loaded');
    
  } else if (windData.type === 'fallback') {
    console.log('⚠️ Wind visualization fallback:', windData.message);
    showStatusMessage(`⚠️ ${windData.message}`);
    
  } else {
    console.log('🔄 Loading wind as particle system (legacy)...');
    loadWindParticles(windData);
  }
}

// Add wind legend
function addWindLegend(legendData) {
  if (!legendData) return;
  
  // Remove existing wind legend
  const existingLegend = document.getElementById('wind-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  const legend = document.createElement('div');
  legend.id = 'wind-legend';
  legend.style.cssText = `
    position: absolute;
    bottom: 80px;
    left: 20px;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    z-index: 1000;
  `;
  
  legend.innerHTML = `
    <div><strong>${legendData.title}</strong></div>
    <div style="margin-top: 5px;">
      <div style="background: linear-gradient(to right, #ffffff, #002040); height: 20px; width: 150px;"></div>
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>${legendData.min} ${legendData.unit}</span>
        <span>${legendData.max} ${legendData.unit}</span>
      </div>
    </div>
    <div style="margin-top: 5px; font-size: 10px;">White = Calm, Blue = Strong</div>
  `;
  
  document.getElementById('map').appendChild(legend);
}

// Legacy wind particle system (fallback)
function loadWindParticles(windData) {
  const width = windData.width || 10;
  const height = windData.height || 10;
  
  // Create Float32Arrays for the U and V components
  const uData = new Float32Array(windData.uData);
  const vData = new Float32Array(windData.vData);
  
  try {
    // Get WebGL context from the canvas
    const gl = windCanvas.getContext('webgl') || windCanvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported in this browser');
    }
    
    // Initialize the wind visualization with the WebGL context
    const wind = new WindGL(gl);
    
    // Set wind configuration directly on the WindGL instance
    wind.numParticles = 5000;
    wind.fadeOpacity = 0.996;
    wind.speedFactor = 0.25;
    wind.dropRate = 0.003;
    wind.dropRateBump = 0.01;
    
    // Skip setColorRamp entirely - let the library use its default colors
    // The error is coming from this function, so we'll avoid calling it
    console.log('Skipping setColorRamp to avoid color parsing error');
    
    // Create wind image data from U and V components
    const windImage = createWindImage(width, height, uData, vData);
    
    // Set the wind data
    wind.setWind({
      image: windImage
    });
    
    // Helper function to create wind image data
    function createWindImage(width, height, uData, vData) {
      // Create a canvas to generate the wind image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get 2D context for wind image creation');
      }
      
      // Create ImageData object
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Fill the image with wind data
      for (let i = 0; i < width * height; i++) {
        const u = uData[i] || 0;
        const v = vData[i] || 0;
        
        // Normalize values to 0-255 range
        const uNorm = Math.max(0, Math.min(255, Math.floor((u - windData.uMin) / (windData.uMax - windData.uMin) * 255)));
        const vNorm = Math.max(0, Math.min(255, Math.floor((v - windData.vMin) / (windData.vMax - windData.vMin) * 255)));
        
        // RGBA for each pixel
        data[i * 4 + 0] = uNorm; // Red channel for U component
        data[i * 4 + 1] = vNorm; // Green channel for V component
        data[i * 4 + 2] = 0;     // Blue channel
        data[i * 4 + 3] = 255;   // Alpha channel (fully opaque)
      }
      
      // Put the image data on the canvas
      ctx.putImageData(imageData, 0, 0);
      
      return canvas;
    }
    
    // Start the animation
    function frame() {
      if (windLayer === windCanvas && wind) {
        wind.draw();
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
    
    console.log('Wind visualization initialized with webgl-wind');
    
  } catch (error) {
    console.error('Error initializing wind visualization:', error);
    
    // Fallback to simple visualization if WebGL fails
    fallbackToSimpleWindVisualization();
  }
  
  // Helper function for fallback visualization
  function fallbackToSimpleWindVisualization() {
    try {
      console.log('Attempting fallback wind visualization...');
      
      // Get 2D context
      const ctx = windCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('Could not get 2D context for fallback wind visualization');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, windCanvas.width, windCanvas.height);
      
      // Draw simple wind arrows as fallback
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      // Calculate grid for wind arrows
      const gridSize = 50;
      const arrowScale = 20;
      
      for (let x = gridSize; x < windCanvas.width; x += gridSize) {
        for (let y = gridSize; y < windCanvas.height; y += gridSize) {
          // Get wind data for this position
          const xIndex = Math.floor((x / windCanvas.width) * width);
          const yIndex = Math.floor((y / windCanvas.height) * height);
          const dataIndex = yIndex * width + xIndex;
          
          if (dataIndex >= 0 && dataIndex < windData.uData.length) {
            const u = (windData.uData[dataIndex] || 0) * arrowScale;
            const v = (windData.vData[dataIndex] || 0) * arrowScale;
            
            // Skip if wind is too weak
            const magnitude = Math.sqrt(u * u + v * v);
            if (magnitude < 2) continue;
            
            // Draw arrow shaft
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + u, y + v);
            ctx.stroke();
            
            // Draw arrow head
            const angle = Math.atan2(v, u);
            const headLength = 8;
            
            ctx.beginPath();
            ctx.moveTo(x + u, y + v);
            ctx.lineTo(
              x + u - headLength * Math.cos(angle - 0.3), 
              y + v - headLength * Math.sin(angle - 0.3)
            );
            ctx.moveTo(x + u, y + v);
            ctx.lineTo(
              x + u - headLength * Math.cos(angle + 0.3), 
              y + v - headLength * Math.sin(angle + 0.3)
            );
            ctx.stroke();
          }
        }
      }
      
      console.log('Fallback wind visualization completed');
      
    } catch (fallbackError) {
      console.error('Error in fallback wind visualization:', fallbackError);
    }
  }
  
  // Store reference to the canvas
  windLayer = windCanvas;
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, setting up visualization controls...");
  
  // Add visualization controls after a short delay to ensure map is ready
  setTimeout(() => {
    if (document.getElementById('map')) {
      addVisualizationControls();
    }
  }, 1000);
  
  // Update slider event listener
  const yearSlider = document.getElementById('year-slider'); // Use correct ID
  if (yearSlider) {
    const debouncedLoadVisualization = debounce(loadVisualization, 100);
    
    yearSlider.addEventListener('input', function(e) {
      const year = parseInt(e.target.value);
      const yearDisplay = document.getElementById('selected-year');
      if (yearDisplay) {
        yearDisplay.textContent = year;
      }
      selectedYear = year;
      debouncedLoadVisualization(year);
    });
  }
});

// At the end of app.js, make sure all functions are properly exposed
if (typeof window !== 'undefined') {
  // Core functions
  window.initMap = window.initMap;
  window.initMapInternal = initMapInternal;
  window.loadVisualization = loadVisualization;
  
  // Debug functions
  window.debugSpinnerState = debugSpinnerState;
  window.hideLoadingSpinner = hideLoadingSpinner;
  window.showLoadingSpinner = showLoadingSpinner;
  window.analyzeEarthEngineData = analyzeEarthEngineData;
  
  // New visualization functions
  window.addVisualizationControls = addVisualizationControls;
  window.loadTemperatureFromData = loadTemperatureFromData;
  window.loadWindLayer = loadWindLayer;
}

// Add function to create appropriate legends for different visualization types
function addVisualizationLegend(mode, year) {
  // Remove existing legend
  const existingLegend = document.querySelector('.visualization-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  const legend = document.createElement('div');
  legend.className = 'visualization-legend';
  legend.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    z-index: 1000;
  `;
  
  let legendContent = '';
  
  switch(mode) {
    case 'anomaly':
      legendContent = `
        <div><strong>Temperature Anomaly ${year}</strong></div>
        <div style="margin-top: 5px;">
          <div style="background: linear-gradient(to right, #000080, #ffffff, #800000); height: 20px; width: 200px;"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>-3°C</span><span>Baseline</span><span>+3°C</span>
          </div>
        </div>
        <div style="margin-top: 5px; font-size: 10px;">vs 1980-2000 average</div>
      `;
      break;
    case 'terrain':
      legendContent = `
        <div><strong>3D Temperature ${year}</strong></div>
        <div style="margin-top: 5px;">
          <div style="background: linear-gradient(to right, #000080, #ffffff, #800000); height: 20px; width: 200px;"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>15°C</span><span>30°C</span><span>45°C</span>
          </div>
        </div>
        <div style="margin-top: 5px; font-size: 10px;">with terrain elevation</div>
      `;
      break;
    default:
      legendContent = `
        <div><strong>Temperature ${year}</strong></div>
        <div style="margin-top: 5px;">
          <div style="background: linear-gradient(to right, #000080, #ffffff, #800000); height: 20px; width: 200px;"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>15°C</span><span>30°C</span><span>45°C</span>
          </div>
        </div>
      `;
  }
  
  legend.innerHTML = legendContent;
  document.getElementById('map').appendChild(legend);
}
