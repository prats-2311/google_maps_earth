// Earth Engine Code Editor Script for Temperature Time-lapse Animation
// Copy and paste this script into the Earth Engine Code Editor at https://code.earthengine.google.com/

// 1. Get the boundary for Uttar Pradesh
var uttarPradesh = ee.FeatureCollection('FAO/GAUL/2015/level1')
                      .filter(ee.Filter.eq('ADM1_NAME', 'Uttar Pradesh'));

// 2. Define visualization parameters for temperature (matching our web app)
var tempVisParams = {
  min: -10,
  max: 40,
  palette: ['blue', 'cyan', 'green', 'yellow', 'red']
};

// 3. Load the ERA5 climate data (same as our backend)
var temperatureCollection = ee.ImageCollection('ECMWF/ERA5/DAILY')
                          .select('mean_2m_air_temperature')
                          .filterDate('1979-01-01', '2020-12-31');

// 4. Function to create a yearly image with a timestamp
var createYearlyImage = function(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = startDate.advance(1, 'year');
  
  // Calculate yearly mean and convert from Kelvin to Celsius
  var yearlyMean = temperatureCollection.filterDate(startDate, endDate)
                                      .mean()
                                      .subtract(273.15);
  
  // Clip to Uttar Pradesh and apply visualization
  var clippedTemp = yearlyMean.clip(uttarPradesh);
  
  // Create a visualization with year label
  var visualized = clippedTemp.visualize(tempVisParams);
  
  // Add year text overlay
  var yearText = ee.Image().paint(ee.FeatureCollection([
    ee.Feature(ee.Geometry.Point([80.9462, 28.5]), {year: year})
  ]), 1).visualize({palette: ['white'], opacity: 0.8});
  
  return visualized.blend(yearText).set('year', year);
};

// 5. Create a list of years and map the function over it
var years = ee.List.sequence(1979, 2020, 2); // Every 2 years for faster animation
var yearlyImages = ee.ImageCollection.fromImages(years.map(createYearlyImage));

// 6. Define animation export options
var animationArgs = {
  'dimensions': 800,
  'region': uttarPradesh.geometry().bounds(),
  'framesPerSecond': 1.5,
  'crs': 'EPSG:3857',
  'format': 'gif'
};

// 7. Print the video thumbnail to the console to export
print('Temperature Time-lapse Animation for Uttar Pradesh (1979-2020)');
print('Click the thumbnail below to export as GIF:');
print(yearlyImages.getVideoThumbURL(animationArgs));

// 8. Optional: Add the first and last frames to the map for preview
Map.centerObject(uttarPradesh, 7);
Map.addLayer(ee.Image(yearlyImages.first()), {}, '1979 Temperature');
Map.addLayer(ee.Image(yearlyImages.sort('year', false).first()), {}, '2020 Temperature');
Map.addLayer(uttarPradesh, {color: 'white'}, 'Uttar Pradesh Boundary', false);

// 9. Create a more detailed animation with all years (optional - slower)
var createDetailedAnimation = function() {
  var allYears = ee.List.sequence(1979, 2020);
  var detailedImages = ee.ImageCollection.fromImages(allYears.map(createYearlyImage));
  
  var detailedAnimationArgs = {
    'dimensions': 600,
    'region': uttarPradesh.geometry().bounds(),
    'framesPerSecond': 2,
    'crs': 'EPSG:3857',
    'format': 'gif'
  };
  
  print('Detailed Animation (All Years 1979-2020):');
  print(detailedImages.getVideoThumbURL(detailedAnimationArgs));
};

// Uncomment the line below to create detailed animation
// createDetailedAnimation();

// 10. Export instructions
print('');
print('EXPORT INSTRUCTIONS:');
print('1. Click on the thumbnail image above');
print('2. In the export dialog, choose:');
print('   - Format: GIF');
print('   - Name: uttar-pradesh-temperature-timelapse');
print('   - Scale: 1000 (meters per pixel)');
print('3. Click "Export" and wait for processing in the Tasks tab');
print('4. Download the GIF and add it to your web application');

// 11. Additional analysis - temperature trend
var calculateTrend = function() {
  var allYears = ee.List.sequence(1979, 2020);
  var yearlyMeans = allYears.map(function(year) {
    var startDate = ee.Date.fromYMD(year, 1, 1);
    var endDate = startDate.advance(1, 'year');
    var yearlyMean = temperatureCollection.filterDate(startDate, endDate)
                                        .mean()
                                        .subtract(273.15)
                                        .clip(uttarPradesh);
    
    // Calculate mean temperature for the entire region
    var meanTemp = yearlyMean.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: uttarPradesh.geometry(),
      scale: 25000,
      maxPixels: 1e9
    });
    
    return ee.Feature(null, {
      'year': year,
      'temperature': meanTemp.get('mean_2m_air_temperature')
    });
  });
  
  var trendCollection = ee.FeatureCollection(yearlyMeans);
  print('Temperature Trend Data (for TensorFlow training):');
  print(trendCollection.limit(10)); // Show first 10 years
};

// Uncomment to calculate temperature trend
// calculateTrend();