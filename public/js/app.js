// Global variables
let map;
let currentOverlay = null;
let selectedYear = 2000; // Middle of available range to show historical progression
let isLoading = false;
let isInitialized = false;
let earthEngineData = {}; // Store Earth Engine responses for analysis

// Global variables for time-lapse
let timelapseInterval = null;
let timelapseData = {};
let isTimelapseRunning = false;
let currentTimelapseYear = 1979;

// Enhanced visualization modes
let currentVisualizationMode = 'temperature'; // 'temperature', 'weather', 'anomaly', 'terrain'
let windLayer = null;

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
  
  // Time-lapse control buttons
  const playTimelapseBtn = document.getElementById('play-timelapse-btn');
  if (playTimelapseBtn) {
    playTimelapseBtn.addEventListener('click', function() {
      startTimelapse();
    });
  }
  
  const pauseTimelapseBtn = document.getElementById('pause-timelapse-btn');
  if (pauseTimelapseBtn) {
    pauseTimelapseBtn.addEventListener('click', function() {
      pauseTimelapse();
    });
  }
  
  const stopTimelapseBtn = document.getElementById('stop-timelapse-btn');
  if (stopTimelapseBtn) {
    stopTimelapseBtn.addEventListener('click', function() {
      stopTimelapse();
    });
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
  // In a real application, this would use the Google Maps Platform Aerial View API
  // For this demo, we'll embed a YouTube video of Lucknow
  
  const immersiveOverlay = document.getElementById('immersive-overlay');
  const immersiveContent = document.getElementById('immersive-content');
  
  // Embed a YouTube video of Lucknow (replace with actual Aerial View in a real app)
  immersiveContent.innerHTML = `
    <iframe 
      width="100%" 
      height="100%" 
      src="https://www.youtube.com/embed/vQ9LHmDLYWU?autoplay=1&mute=0" 
      title="Lucknow Aerial View" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;
  
  immersiveOverlay.classList.remove('hidden');
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

// Bulk loading with progress tracking
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

  // Create EventSource for Server-Sent Events
  const eventSource = new EventSource(`/ee-bulk-load?startYear=${startYear}&endYear=${endYear}`);

  eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    // Update progress bar
    progressFill.style.width = `${data.progress}%`;
    progressPercentage.textContent = `${data.progress}%`;
    progressStatus.textContent = data.status;
    
    // Store cached data with complete structure
    if (data.mapid && !data.cached) {
      timelapseData[data.year] = {
        mapid: data.mapid,
        token: data.token || '',
        year: data.year,
        dataType: 'temperature',
        urlFormat: data.urlFormat
      };
      console.log(`Cached data for year ${data.year}:`, timelapseData[data.year]);
    }
    
    // Handle completion
    if (data.completed) {
      eventSource.close();
      document.getElementById('load-all-data-btn').disabled = false;
      document.getElementById('timelapse-controls').classList.remove('hidden');
      
      // Update slider range
      document.getElementById('year-slider').min = startYear;
      document.getElementById('year-slider').max = endYear;
      
      progressStatus.textContent = `Complete! Loaded ${data.totalYears} years`;
      console.log('All data cached:', Object.keys(timelapseData).length, 'years');
      
      setTimeout(() => {
        loadingSection.classList.add('hidden');
      }, 2000);
    }
    
    // Handle errors
    if (data.error) {
      console.error('Loading error:', data.error);
      progressStatus.textContent = `Error: ${data.error}`;
    }
  };

  eventSource.onerror = function(error) {
    console.error('EventSource error:', error);
    eventSource.close();
    document.getElementById('load-all-data-btn').disabled = false;
    progressStatus.textContent = 'Connection error';
  };
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

// Simplified time-lapse with better logging
async function startTimelapse() {
  console.log(`🎬 [TIMELAPSE] Starting time-lapse...`);
  
  if (Object.keys(timelapseData).length === 0) {
    console.error(`❌ [TIMELAPSE] No cached data available`);
    alert('Please load data first using "Load All Historical Data" button');
    return;
  }
  
  const speed = parseInt(document.getElementById('timelapse-speed').value);
  const years = Object.keys(timelapseData).map(Number).sort((a, b) => a - b);
  
  console.log(`📊 [TIMELAPSE] Available years:`, years);
  console.log(`⚡ [TIMELAPSE] Speed setting: ${speed}ms delay between years`);
  
  if (years.length === 0) {
    console.error(`❌ [TIMELAPSE] No valid years found in cached data`);
    alert('No cached data available for time-lapse');
    return;
  }
  
  isTimelapseRunning = true;
  
  // Update UI
  document.getElementById('play-timelapse-btn').classList.add('hidden');
  document.getElementById('pause-timelapse-btn').classList.remove('hidden');
  
  console.log(`🚀 [TIMELAPSE] Starting time-lapse with ${years.length} years`);
  
  // Process each year sequentially
  for (let i = 0; i < years.length && isTimelapseRunning; i++) {
    const year = years[i];
    currentTimelapseYear = year;
    
    console.log(`\n🎯 [TIMELAPSE] === YEAR ${year} (${i + 1}/${years.length}) ===`);
    
    try {
      const startTime = performance.now();
      
      // Wait for tiles to load completely
      await displayCachedYear(year);
      
      const loadTime = (performance.now() - startTime).toFixed(0);
      console.log(`✅ [TIMELAPSE] Year ${year} completed in ${loadTime}ms`);
      
      // Wait additional delay before next year
      if (isTimelapseRunning && i < years.length - 1) {
        console.log(`⏳ [TIMELAPSE] Waiting ${speed}ms before next year...`);
        await new Promise(resolve => setTimeout(resolve, speed));
      }
      
    } catch (error) {
      console.error(`❌ [TIMELAPSE] Error with year ${year}:`, error);
    }
  }
  
  if (isTimelapseRunning) {
    console.log(`🎉 [TIMELAPSE] Time-lapse completed!`);
    stopTimelapse();
  }
}

function pauseTimelapse() {
  console.log(`⏸️ [TIMELAPSE] Pausing time-lapse at year ${currentTimelapseYear}`);
  isTimelapseRunning = false;
  
  // Update UI
  document.getElementById('play-timelapse-btn').classList.remove('hidden');
  document.getElementById('pause-timelapse-btn').classList.add('hidden');
}

function stopTimelapse() {
  console.log(`⏹️ [TIMELAPSE] Stopping time-lapse`);
  isTimelapseRunning = false;
  
  // Update UI
  document.getElementById('play-timelapse-btn').classList.remove('hidden');
  document.getElementById('pause-timelapse-btn').classList.add('hidden');
}

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
    <div style="font-weight: bold; margin-bottom: 10px;">Visualization Mode</div>
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
  `;
  
  document.getElementById('map').appendChild(controls);
  
  // Add event listeners
  const radios = controls.querySelectorAll('input[name="vizMode"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentVisualizationMode = e.target.value;
      const currentYear = parseInt(document.getElementById('year-slider').value);
      loadVisualization(currentYear);
    });
  });
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

// Main visualization loader
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
  
  console.log(`Loading ${currentVisualizationMode} visualization for year ${year}...`);
  
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

// Load wind layer using webgl-wind library
function loadWindLayer(windData) {
  console.log('Wind data received:', windData);
  
  // Remove existing wind canvas if it exists
  if (windLayer) {
    if (windLayer.remove) {
      windLayer.remove();
    } else if (windLayer.parentNode) {
      windLayer.parentNode.removeChild(windLayer);
    }
  }
  
  // Create wind canvas overlay
  const windCanvas = document.createElement('canvas');
  windCanvas.id = 'wind-canvas';
  windCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
    background: transparent;
  `;
  
  document.getElementById('map').appendChild(windCanvas);
  
  // Set canvas dimensions to match the map container
  const mapContainer = document.getElementById('map');
  windCanvas.width = mapContainer.clientWidth;
  windCanvas.height = mapContainer.clientHeight;
  
  // Prepare wind data for the webgl-wind library
  const width = windData.width;
  const height = windData.height;
  
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
