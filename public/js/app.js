// Global variables
let map;
let currentOverlay = null;
let selectedYear = 2000; // Middle of available range to show historical progression
let isLoading = false;
let isInitialized = false;
let earthEngineData = {}; // Store Earth Engine responses for analysis

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
    
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.error("Google Maps API not loaded!");
      showError("Google Maps API failed to load. Please refresh the page.");
      return;
    }
    
    // Center on Uttar Pradesh, India with better bounds
    const uttarPradeshCenter = { lat: 26.8467, lng: 80.9462 }; // Lucknow coordinates
    const uttarPradeshBounds = {
      north: 29.3,  // Northern boundary
      south: 23.9,  // Southern boundary
      east: 84.6,   // Eastern boundary
      west: 77.1    // Western boundary
    };
    
    // Check if the map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error("Map element not found!");
      showError("Map container element not found.");
      return;
    }
    
    console.log("Map element found, creating Google Map instance...");
    
    // Create the map with optimized settings for Uttar Pradesh
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
      },
      styles: [
        {
          featureType: 'administrative.province',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#4d90fe' }, { weight: 1.5 }]
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#1a73e8' }]
        }
      ]
    });
    
    console.log("Map initialized, loading timelapse layer...");
    
    // Add a listener for when the map is idle (fully loaded)
    google.maps.event.addListenerOnce(map, 'idle', function() {
      console.log("Map is idle, loading initial data...");
      // Load the initial year's data
      loadTimelapseLayer(selectedYear);
      
      // Signal that the app has loaded successfully
      if (window.appLoaded) {
        window.appLoaded();
      }
    });
  } catch (error) {
    console.error("Error initializing map:", error);
    hideLoadingSpinner();
  }
}

// Set up event listeners for UI controls
function setupEventListeners() {
  // Year slider with debouncing
  const yearSlider = document.getElementById('year-slider');
  const selectedYearDisplay = document.getElementById('selected-year');
  
  // Create debounced version of loadTimelapseLayer
  const debouncedLoadTimelapseLayer = debounce(loadTimelapseLayer, 300);
  
  yearSlider.addEventListener('input', function() {
    selectedYear = parseInt(this.value);
    selectedYearDisplay.textContent = selectedYear;
    
    // Update display immediately for responsiveness
    selectedYearDisplay.textContent = selectedYear;
    
    // Load data with debouncing to prevent too many requests
    debouncedLoadTimelapseLayer(selectedYear);
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
}

// Load the Earth Engine timelapse layer for a specific year
function loadTimelapseLayer(year) {
  // Prevent multiple simultaneous requests
  if (isLoading) {
    console.log("Already loading data, request ignored");
    return;
  }
  
  isLoading = true;
  showLoadingSpinner();
  
  // Performance monitoring
  const startTime = performance.now();
  console.log(`Loading timelapse layer for year ${year}...`);
  
  // Remove previous overlay if it exists
  if (currentOverlay) {
    console.log("Removing previous overlay");
    
    // Check if it's a rectangle (simulated data) or a map overlay
    if (currentOverlay instanceof google.maps.Rectangle) {
      currentOverlay.setMap(null);
    } else {
      // Assume it's a map overlay
      map.overlayMapTypes.clear();
    }
    
    currentOverlay = null;
  }
  
  // Fetch the Earth Engine layer from our backend
  console.log("Fetching Earth Engine layer from backend...");
  fetch(`/ee-timelapse-layer?year=${year}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Received response from server:", data);
      if (data.success) {
        console.log("Received successful response:", data);
        
        // Store the Earth Engine data for analysis
        earthEngineData[year] = data;
        console.log("Earth Engine data structure for year", year, ":", {
          success: data.success,
          mapid: data.mapid,
          token: data.token,
          year: data.year,
          simulated: data.simulated,
          urlFormat: data.urlFormat,
          fallback_reason: data.fallback_reason
        });
        
        // Check if this is a simulated response
        if (data.simulated) {
          console.log("Using simulated temperature layer");
          
          // Create a simulated overlay using a colored rectangle for demonstration
          const bounds = {
            north: 29.3,  // Northern boundary of Uttar Pradesh
            south: 23.9,  // Southern boundary of Uttar Pradesh
            east: 84.6,   // Eastern boundary of Uttar Pradesh
            west: 77.1    // Western boundary of Uttar Pradesh
          };
          
          // Create a colored rectangle overlay
          const rectangle = new google.maps.Rectangle({
            bounds: bounds,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF9900',
            fillOpacity: 0.35,
            map: map
          });
          
          // Store the rectangle as the current overlay
          currentOverlay = rectangle;
          
          // Add a label to indicate this is simulated data
          const center = new google.maps.LatLng(
            (bounds.north + bounds.south) / 2,
            (bounds.east + bounds.west) / 2
          );
          
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 10px; text-align: center;">
                      <h3 style="margin-top: 0;">${data.fallback_reason ? 'Fallback' : 'Simulated'} Temperature Data</h3>
                      <p>Year: ${year}</p>
                      ${data.fallback_reason ? 
                        `<p>Earth Engine error: ${data.fallback_reason}</p>
                         <p>Using simulated data as fallback.</p>` :
                        `<p>This is a demonstration using simulated data.</p>
                         <p>The actual Earth Engine integration requires additional setup.</p>`
                      }
                    </div>`,
            position: center
          });
          
          infoWindow.open(map);
          
          // Close the info window when clicking on the map
          google.maps.event.addListenerOnce(map, 'click', function() {
            infoWindow.close();
          });
          
          console.log("Simulated layer added successfully");
          hideLoadingSpinner();
        } else {
          // Create the tile layer using the mapid and token (or urlFormat for newer API)
          console.log("Creating tile layer with mapid:", data.mapid);
          
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
            name: `Temperature ${year}`,
            getTileUrl: getTileUrlFunction,
            tileSize: new google.maps.Size(256, 256),
            minZoom: 1,
            maxZoom: 20
          });
          
          // Add the layer to the map
          console.log("Adding layer to map");
          map.overlayMapTypes.clear();
          map.overlayMapTypes.push(tileSource);
          currentOverlay = tileSource;
          
          console.log("Layer added successfully");
          
          // Wait for tiles to start loading, then hide spinner
          setTimeout(() => {
            const endTime = performance.now();
            const loadTime = (endTime - startTime).toFixed(2);
            console.log(`Delayed spinner hide - ensuring tiles have started loading`);
            console.log(`Total load time for year ${year}: ${loadTime}ms`);
            hideLoadingSpinner();
          }, 1500);
          
          // Also hide spinner immediately if user clicks close button
          const closeBtn = document.getElementById('close-loading-btn');
          if (closeBtn) {
            closeBtn.style.display = 'block';
            closeBtn.style.pointerEvents = 'auto';
          }
        }
      } else {
        console.error('Error loading Earth Engine layer:', data.error);
        hideLoadingSpinner();
        alert('Error loading climate data: ' + (data.error || 'Unknown error'));
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
        errorText.textContent = 'Error loading climate data: ' + error.message;
        errorMessage.classList.remove('hidden');
      } else {
        alert('Error: ' + error.message);
      }
      
      isLoading = false;
    });
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