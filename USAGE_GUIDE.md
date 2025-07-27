# Climate Visualization Usage Guide

## Quick Start

1. **Start the Server**:
   ```bash
   cd /Users/prateeksrivastava/Documents/google_maps_earth
   npm start
   ```

2. **Open the Application**:
   Navigate to `http://localhost:3000` in your browser

## Using the Historical Data (1979-2020)

### Time-Lapse Visualization
- **Year Slider**: Use the slider to select any year from 1979 to 2020
- **Default Year**: Starts at 2000 (middle of available range)
- **Data Source**: Real ERA5 climate data from Google Earth Engine
- **Coverage**: 41 years of historical temperature data

### What You'll See
- **Temperature Overlay**: Color-coded temperature visualization on the map
- **Color Scale**: Blue (cool, ~15°C) to Red/Magenta (hot, ~45°C)
- **Geographic Focus**: Uttar Pradesh, India region
- **Real-time Loading**: Data fetched and displayed as you move the slider

### AI Predictions
- **Click "Predict Future Temperatures"** to see:
  - 2040 temperature forecast
  - 2050 temperature forecast  
  - 2060 temperature forecast
- **Model**: TensorFlow.js neural network trained on historical data
- **Training Data**: 1979-2023 temperature averages

## Data Information Panel

The sidebar shows:
- **Dataset**: ERA5 Daily Aggregates
- **Source**: ECMWF via Google Earth Engine
- **Coverage**: 1979-2020 (41 years)
- **Parameter**: Mean 2-meter Air Temperature
- **Region**: Uttar Pradesh, India

## Testing Different Years

### Available Range (Real Data)
- **1979**: First year of ERA5 data
- **1990s**: Show climate patterns from the 90s
- **2000s**: Demonstrate warming trends
- **2020**: Most recent available data

### Outside Range (Fallback)
- **Years before 1979**: Shows simulated data with explanation
- **Years after 2020**: Shows simulated data with explanation

## Troubleshooting

### If Map Doesn't Load
1. Check browser console for errors
2. Verify server is running on port 3000
3. Test Earth Engine connection: `http://localhost:3000/test`

### If No Temperature Data Shows
1. Try different years within 1979-2020 range
2. Check network connectivity
3. Verify Earth Engine authentication is working

## Advanced Features

### Solutions Layer
- **Solar Potential**: Click "Show Solar Potential" then click on map areas
- **Cooling Zones**: Click "Show Cooling Zones" to see green spaces

### Immersive View
- **Available after prediction**: Click "View Immersive Impact" for cinematic view
- **YouTube Integration**: Shows aerial footage of Lucknow

## API Endpoints

- **Main App**: `http://localhost:3000/`
- **Test Page**: `http://localhost:3000/test`
- **Earth Engine Test**: `http://localhost:3000/test-ee`
- **Time-lapse Data**: `http://localhost:3000/ee-timelapse-layer?year=YYYY`

## Data Quality Notes

- **ERA5 Reanalysis**: High-quality, scientifically validated climate data
- **Spatial Resolution**: ~31km grid resolution
- **Temporal Resolution**: Daily data aggregated to annual means
- **Processing**: Kelvin to Celsius conversion applied
- **Visualization**: Optimized for Indian temperature ranges (15-45°C)

This application provides a comprehensive view of climate change in Uttar Pradesh using real scientific data spanning over 4 decades.