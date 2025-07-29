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
  // Setup event listeners first
  setupEventListeners();
  
  // Only show loading spinner if not already initialized
  if (!isInitialized) {
    console.log("App not yet initialized, showing loading spinner...");
    showLoadingSpinner();
  } else {
    console.log("App already initialized, skipping loading spinner");
  }
};

// This function will be called by Google Maps API when it's loaded (callback)
window.initMap = function() {
  console.log("Google Maps API loaded, initializing map...");
  try {
    initMapInternal();
    isInitialized = true; // Mark as initialized
  } catch (error) {
    console.error("Error in initMap:", error);
    hideLoadingSpinner();
    showError("Failed to initialize Google Maps: " + error.message);
  }
};

// Ensure initMap is available globally for the callback
if (typeof window !== 'undefined') {
  window.initMap = window.initMap;
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
      console.log("Map is idle, loading initial temperature data...");
      hideLoadingSpinner();
      
      // Load initial temperature data
      loadTemperatureLayer(selectedYear);
      
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
  
  // Create debounced version of loadTemperatureLayer for time-lapse feature
  // Reduced debounce time for more responsive time-lapse
  const debouncedLoadTemperatureLayer = debounce(loadTemperatureLayer, 100);
  
  yearSlider.addEventListener('input', function() {
    selectedYear = parseInt(this.value);
    
    // Update display immediately for responsiveness
    selectedYearDisplay.textContent = selectedYear;
    
    console.log(`Year slider changed to: ${selectedYear}`);
    
    if (timelapseData[selectedYear]) {
      // Use cached data for instant display
      displayCachedYear(selectedYear);
    } else {
      // Load from server
      debouncedLoadTemperatureLayer(selectedYear);
    }
  });
  
  // Prediction button
  const predictBtn = document.getElementById('predict-btn');
  predictBtn.addEventListener('click', function() {
    showLoadingSpinner();
    setTimeout(() => {
      trainAndPredict();
      fetchAirQuality();
      hideLoadingSpinner();
      
      // Show the immersive panel after prediction
      document.getElementById('immersive-panel').classList.remove('hidden');
    }, 1500); // Simulate processing time
  });
  
  // Solar potential button
  const solarBtn = document.getElementById('show-solar-btn');
  solarBtn.addEventListener('click', function() {
    showSolarPotential();
  });
  
  // Cooling zones button
  const coolingBtn = document.getElementById('show-cooling-zones-btn');
  coolingBtn.addEventListener('click', function() {
    showCoolingZones();
  });
  
  // Immersive view button
  const immersiveBtn = document.getElementById('immersive-view-btn');
  immersiveBtn.addEventListener('click', function() {
    showImmersiveView();
  });
  
  // Close immersive view button
  const closeImmersiveBtn = document.getElementById('close-immersive-btn');
  closeImmersiveBtn.addEventListener('click', function() {
    document.getElementById('immersive-overlay').classList.add('hidden');
  });
  
  // Close loading spinner button
  const closeLoadingBtn = document.getElementById('close-loading-btn');
  if (closeLoadingBtn) {
    closeLoadingBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Close loading button clicked");
      hideLoadingSpinner();
    });
  } else {
    console.error("Close loading button not found!");
  }

  // Bulk loading button
  const loadAllBtn = document.getElementById('load-all-data-btn');
  loadAllBtn.addEventListener('click', startBulkLoading);

  // Time-lapse controls
  const playBtn = document.getElementById('play-timelapse-btn');
  const pauseBtn = document.getElementById('pause-timelapse-btn');
  const stopBtn = document.getElementById('stop-timelapse-btn');

  playBtn.addEventListener('click', startTimelapse);
  pauseBtn.addEventListener('click', pauseTimelapse);
  stopBtn.addEventListener('click', stopTimelapse);
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
