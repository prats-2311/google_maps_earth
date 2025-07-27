# Climate Data Sources and Time Periods

## Overview
This application fetches **real climate data** from Google Earth Engine and displays it as an interactive time-lapse visualization for Uttar Pradesh, India.

## Primary Data Source: ERA5 Reanalysis

### Dataset Details
- **Full Name**: ECMWF ERA5 Daily Aggregates
- **Earth Engine ID**: `ECMWF/ERA5/DAILY`
- **Provider**: European Centre for Medium-Range Weather Forecasts (ECMWF)
- **Data Type**: Reanalysis (combines observations with weather models)

### Specific Parameter
- **Variable**: `mean_2m_air_temperature`
- **Description**: Daily mean air temperature at 2 meters above ground
- **Original Units**: Kelvin (K)
- **Converted Units**: Celsius (°C)
- **Conversion**: Temperature_C = Temperature_K - 273.15

### Temporal Coverage
- **Available Range**: 1979-01-01 to 2020-12-31
- **Application Range**: 1980-2020 (41 years)
- **Resolution**: Daily data aggregated to annual means
- **Update Frequency**: Historical data (not real-time)

### Spatial Coverage
- **Global Coverage**: Worldwide at ~31km resolution
- **Focus Area**: Uttar Pradesh, India
- **Boundaries**: 
  - North: 29.3°N
  - South: 23.9°N  
  - East: 84.6°E
  - West: 77.1°E
- **Map Center**: Lucknow (26.8467°N, 80.9462°E)

## Data Processing Pipeline

### Server-Side Processing (server.js)
1. **Year Selection**: User selects year via slider (1980-2020)
2. **Data Filtering**: Filter ERA5 dataset for selected year
   ```javascript
   const dataset = ee.ImageCollection('ECMWF/ERA5/DAILY')
     .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
     .select('mean_2m_air_temperature');
   ```
3. **Aggregation**: Calculate annual mean temperature
   ```javascript
   const meanTemp = dataset.mean();
   ```
4. **Unit Conversion**: Convert Kelvin to Celsius
   ```javascript
   const tempCelsius = meanTemp.subtract(273.15);
   ```
5. **Visualization**: Apply color palette and generate map tiles

### Visualization Parameters
- **Temperature Range**: 15°C to 45°C
- **Color Palette**: 18-color gradient
  - **Cool (15°C)**: Deep blue (`#000080`)
  - **Moderate (30°C)**: Yellow (`#ffff00`)
  - **Hot (45°C)**: Magenta (`#ff00ff`)

## AI Training Data

### Local Dataset (data.js)
- **Source**: Historical temperature averages for Uttar Pradesh
- **Time Range**: 1980-2023 (44 data points)
- **Purpose**: Train TensorFlow.js model for future predictions
- **Sample Data**:
  ```javascript
  { year: 1980, avgTemp: 25.1 },
  { year: 2023, avgTemp: 28.5 }
  ```

### Future Predictions
- **Model**: Simple neural network regression
- **Training**: Browser-based using TensorFlow.js
- **Predictions**: 2040, 2050, 2060 temperature forecasts
- **Method**: Extrapolation based on historical trends

## Data Quality and Limitations

### ERA5 Strengths
- ✅ High-quality reanalysis data
- ✅ Consistent global coverage
- ✅ Well-validated by scientific community
- ✅ Suitable for climate trend analysis

### Current Limitations
- ⚠️ Data ends at 2020 (ERA5 processing lag)
- ⚠️ ~31km spatial resolution (regional averages)
- ⚠️ Reanalysis data (not direct observations)

### Fallback Mechanisms
- **Simulated Data**: If Earth Engine fails, shows colored overlay
- **Error Handling**: Graceful degradation with user notifications
- **Year Validation**: Automatic fallback for years outside 1979-2020

## Real-Time vs Historical Data

### What's Real-Time
- ❌ **Temperature Data**: Historical only (1979-2020)
- ✅ **Air Quality**: Simulated (can be real-time with API integration)
- ✅ **Map Interaction**: Real-time user interface

### What's Historical
- ✅ **ERA5 Temperature**: 1979-2020 historical reanalysis
- ✅ **Training Data**: 1980-2023 temperature averages
- ✅ **Climate Trends**: Long-term historical patterns

## Technical Implementation

### Data Flow
1. **User Input**: Year selection (1980-2020)
2. **Backend Request**: `/ee-timelapse-layer?year=YYYY`
3. **Earth Engine Query**: Filter and process ERA5 data
4. **Tile Generation**: Create map tiles with temperature visualization
5. **Frontend Display**: Overlay tiles on Google Maps

### API Response Format
```json
{
  "success": true,
  "mapid": "projects/earthengine-legacy/maps/...",
  "token": "",
  "year": 2020,
  "simulated": false,
  "urlFormat": "https://earthengine.googleapis.com/v1/projects/.../tiles/{z}/{x}/{y}"
}
```

This comprehensive data pipeline provides scientifically accurate climate visualization for understanding temperature trends in Uttar Pradesh over the past 40+ years.