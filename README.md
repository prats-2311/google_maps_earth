# Climate Visualization for Uttar Pradesh

An interactive climate visualization application that shows historical temperature data, predicts future climate trends, and displays environmental health impacts for Uttar Pradesh, India.

## Features

### Core Features
- **Historical Climate Time-Lapse**: Interactive visualization showing average annual temperature from 1980 to present
- **AI-Powered Future Prediction**: TensorFlow.js model to predict temperatures for future decades
- **Real-Time Health Impact**: Display of current Air Quality Index for Lucknow

### Advanced Features
- **Immersive 3D Impact Visualization**: Cinematic 3D fly-through of Lucknow landmarks
- **Solutions Layer**: Solar potential visualization and green spaces mapping
- **Personalized Location Analysis**: Address-specific environmental information

## Current Implementation Status

The application is **FULLY FUNCTIONAL** with real Earth Engine data integration.

### Working Features
- ✅ **Real Earth Engine Data**: ERA5 climate dataset integration working
- ✅ **Google Maps Integration**: Professional map interface with working API key
- ✅ **Interactive Time-lapse**: Year slider (1980-2020) with real temperature data
- ✅ **TensorFlow.js AI Model**: Future temperature predictions (2040, 2050, 2060)
- ✅ **Professional UI**: Loading states, error handling, responsive design
- ✅ **Fallback Systems**: Graceful handling of API limitations

### Data Sources & Time Periods

#### Primary Dataset: ERA5 Daily Aggregates
- **Source**: `ECMWF/ERA5/DAILY` from Google Earth Engine
- **Parameter**: `mean_2m_air_temperature` (2-meter air temperature)
- **Time Range**: 1979-2020 (ERA5 reanalysis data availability)
- **Spatial Coverage**: Global, focused on Uttar Pradesh, India
- **Temporal Resolution**: Daily data aggregated to annual means
- **Units**: Converted from Kelvin to Celsius (15°C to 45°C range)

#### Visualization Details
- **Color Palette**: 18-color gradient from blue (cool) to red (hot)
- **Temperature Range**: 15°C (blue) to 45°C (red/magenta)
- **Geographic Focus**: Uttar Pradesh boundaries (23.9°N to 29.3°N, 77.1°E to 84.6°E)
- **Map Center**: Lucknow (26.8467°N, 80.9462°E)

#### AI Training Data
- **Source**: Local `data.js` file with historical temperature averages
- **Time Range**: 1980-2023 (44 years of data)
- **Purpose**: Train TensorFlow.js model for future predictions
- **Predictions**: 2040, 2050, 2060 temperature forecasts

## Prerequisites

- Node.js (v14 or higher)
- Google Cloud account with Earth Engine API enabled
- Google Maps API key

## Setup Instructions

### 1. Clone the repository
```bash
git clone <repository-url>
cd google_maps_earth
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Google Earth Engine authentication
1. Create a Google Cloud Project at https://console.cloud.google.com/
2. Enable the Earth Engine API for your project
3. Create a service account with the "Earth Engine Resource Admin" role
4. Generate a JSON key file for this service account
5. Save the key file as `privatekey.json` in the root directory of this project
6. Register your service account for Earth Engine access at https://signup.earthengine.google.com/#!/service_accounts

#### Testing Earth Engine Connection
After setting up your Earth Engine credentials, you can test the connection by running:
```bash
node test-connection.js
```
This script will verify that your authentication is working and that you can access the ERA5 climate dataset used in the application.

### 4. Google Maps API key
The application is already configured with a Google Maps API key:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBR5_tFhPYuUTaaNgvPBbSzy8VnPSZTJNo&libraries=places"></script>
```

If you need to use your own API key, you can replace it in the `public/index.html` file.

### 5. Start the server
You can start the server using npm:
```bash
npm start
```

Or use the provided start script:
```bash
./start.sh
```

### 6. Access the application
Open your browser and navigate to `http://localhost:3000`

#### Testing the Application
You can test if the Earth Engine connection is working correctly by visiting:
```
http://localhost:3000/test
```
This page provides a simple interface to test the Earth Engine API connection and the time-lapse layer generation.

## Project Structure

```
google_maps_earth/
├── public/                 # Frontend files
│   ├── css/                # CSS stylesheets
│   │   └── style.css       # Main stylesheet
│   ├── js/                 # JavaScript files
│   │   ├── app.js          # Main application logic
│   │   └── data.js         # Historical temperature data
│   └── index.html          # Main HTML file
├── server.js               # Express server and Earth Engine integration
├── package.json            # Project dependencies
├── privatekey.json         # Google Earth Engine credentials (you need to create this)
└── README.md               # Project documentation
```

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **APIs**: Google Earth Engine, Google Maps Platform
- **AI/ML**: TensorFlow.js

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Earth Engine for climate data
- Google Maps Platform for visualization capabilities