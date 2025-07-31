// Location-agnostic climate data structure for AI model training
// This will be populated dynamically based on selected location
// Data aligns with ERA5 dataset availability from Google Earth Engine (1979-2020)
// Extended with recent estimates for AI model training (2021-2023)
let locationSpecificData = {};

// Generate fallback/default temperature data for AI training when no cached data is available
// This uses global temperature anomaly trends as a baseline
function generateFallbackTemperatureData(baseTemp = 20) {
  const data = [];
  for (let year = 1979; year <= 2023; year++) {
    // Apply realistic warming trend: ~0.02°C per year based on global climate data
    const warming = (year - 1979) * 0.02;
    // Add some natural variability (±1°C)
    const variation = (Math.sin((year - 1979) * 0.5) * 0.5) + (Math.random() - 0.5) * 0.8;
    const avgTemp = baseTemp + warming + variation;
    data.push({ year: year, avgTemp: Math.round(avgTemp * 10) / 10 });
  }
  return data;
}

// Default global temperature data structure
const historicalTemperatureData = generateFallbackTemperatureData();

// Function to get location-specific climate data
function getLocationClimateData(locationKey, lat = null) {
  if (locationSpecificData[locationKey]) {
    return locationSpecificData[locationKey];
  }
  
  // Generate location-appropriate baseline temperature based on latitude
  let baseTemp = 20; // Default global average
  if (lat !== null) {
    baseTemp = estimateBaseTemperatureFromLatitude(lat);
  }
  
  return generateFallbackTemperatureData(baseTemp);
}

// Function to store location-specific data from Earth Engine results
function storeLocationClimateData(locationKey, climateData) {
  locationSpecificData[locationKey] = climateData;
}

// Estimate baseline temperature based on latitude for more realistic fallback data
function estimateBaseTemperatureFromLatitude(lat) {
  const absLat = Math.abs(lat);
  
  if (absLat >= 60) {
    // Arctic/Antarctic regions
    return Math.max(-10, 5 - (absLat - 60) * 0.5);
  } else if (absLat >= 45) {
    // Temperate/Subarctic regions
    return 15 - (absLat - 45) * 0.3;
  } else if (absLat >= 23.5) {
    // Temperate regions
    return 20 - (absLat - 23.5) * 0.2;
  } else {
    // Tropical/Subtropical regions
    return 26 - absLat * 0.1;
  }
}

// Function to clear location data cache
function clearLocationDataCache() {
  locationSpecificData = {};
}