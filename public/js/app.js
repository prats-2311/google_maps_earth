// Global variables
let map;
let currentOverlay = null;
let selectedYear = 2020;
let isLoading = false;

// Initialize the map when the page loads
window.onload = function() {
  console.log("Window loaded, initializing map...");
  initMap();
  setupEventListeners();
};

// Initialize Google Map
function initMap() {
  try {
    console.log("Initializing Google Map...");
    // Center on Uttar Pradesh, India
    const uttarPradesh = { lat: 26.8467, lng: 80.9462 }; // Lucknow coordinates
    
    // Check if the map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error("Map element not found!");
      return;
    }
    
    // Create the map
    map = new google.maps.Map(mapElement, {
      center: uttarPradesh,
      zoom: 7,
      mapTypeId: 'terrain',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'administrative.province',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#4d90fe' }, { weight: 1.5 }]
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
  // Year slider
  const yearSlider = document.getElementById('year-slider');
  const selectedYearDisplay = document.getElementById('selected-year');
  
  yearSlider.addEventListener('input', function() {
    selectedYear = parseInt(this.value);
    selectedYearDisplay.textContent = selectedYear;
    loadTimelapseLayer(selectedYear);
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
                      <h3 style="margin-top: 0;">Simulated Temperature Data</h3>
                      <p>Year: ${year}</p>
                      <p>This is a demonstration using simulated data.</p>
                      <p>The actual Earth Engine integration requires additional setup.</p>
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
          // Create the tile layer using the mapid and token
          console.log("Creating tile layer with mapid:", data.mapid);
          const tileSource = new google.maps.ImageMapType({
            name: `Temperature ${year}`,
            getTileUrl: function(tile, zoom) {
              return `https://earthengine.googleapis.com/map/${data.mapid}/${zoom}/${tile.x}/${tile.y}?token=${data.token}`;
            },
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
          hideLoadingSpinner();
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

// Train TensorFlow.js model and predict future temperatures
function trainAndPredict() {
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
  } else {
    console.error("Loading spinner element not found!");
  }
}

// Hide loading spinner
function hideLoadingSpinner() {
  console.log("Hiding loading spinner");
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.add('hidden');
  } else {
    console.error("Loading spinner element not found!");
  }
  
  // Also reset the loading state
  isLoading = false;
}