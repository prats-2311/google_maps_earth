<p align="center">
  <img src="https://img.shields.io/badge/node-v18.0.0+-brightgreen.svg?style=flat-square" alt="node" />
  <img src="https://img.shields.io/badge/npm-v8.0.0+-blue.svg?style=flat-square" alt="npm" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" />
  <img src="https://img.shields.io/badge/contributions-welcome-orange.svg?style=flat-square" alt="Contributions Welcome" />
  <img src="https://img.shields.io/badge/Powered_by-Render-black?style=flat-square" alt="Powered by Render">
</p>

# Global Climate Visualization

The Global Climate Visualization application is a Node.js and Express application designed for environmental awareness and education. It provides an interactive platform to visualize climate data, making complex environmental information accessible through modern web technologies and real-time data integration.

By combining Google Earth Engine data with interactive visualizations, we create a professional product that helps users understand climate patterns and environmental changes worldwide.

## Features

### Core Features

- **Global Location Search**: Search and select any location worldwide for climate analysis
- **Historical Climate Time-Lapse**: Interactive visualization showing average annual temperature from 1980 to present
- **AI-Powered Future Prediction**: TensorFlow.js model to predict temperatures for future decades based on location-specific data
- **Real-Time Health Impact**: Display of current Air Quality Index for selected location

### Advanced Features

- **Immersive 3D Impact Visualization**: Cinematic 3D fly-through of selected location landmarks
- **Solutions Layer**: Solar potential visualization and green spaces mapping for any location
- **Personalized Location Analysis**: Address-specific environmental information worldwide

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
- **Spatial Coverage**: Global coverage with location-specific analysis
- **Temporal Resolution**: Daily data aggregated to annual means
- **Units**: Converted from Kelvin to Celsius (15°C to 45°C range)

#### Visualization Details

- **Color Palette**: 18-color gradient from blue (cool) to red (hot)
- **Temperature Range**: Climate-appropriate ranges based on location latitude
- **Geographic Focus**: Dynamic boundaries based on selected location
- **Map Center**: Automatically centers on selected location

#### AI Training Data

- **Source**: Location-specific climate data with latitude-based temperature estimation
- **Time Range**: 1980-2023 (44 years of data)
- **Purpose**: Train TensorFlow.js model for location-specific future predictions
- **Predictions**: 2040, 2050, 2060 temperature forecasts for selected location

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You will need the following properly installed on your computer:

- [Git](http://git-scm.com/)
- [Node.js](http://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v8.0.0 or higher)
- Google Cloud account with Earth Engine API enabled
- Google Maps API key

## Installing

In a terminal window run these commands:

```bash
git clone <repository-url>
cd google_maps_earth
npm install
```

### Set up Google Earth Engine authentication

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

### Google Maps API key

The application is already configured with a Google Maps API key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBR5_tFhPYuUTaaNgvPBbSzy8VnPSZTJNo&libraries=places"></script>
```

If you need to use your own API key, you can replace it in the `public/index.html` file.

### Add necessary environment variables

For production deployment, you may need to add environment variables to your `.env` file or deployment platform:

```bash
NODE_ENV=production
GOOGLE_EARTH_ENGINE_KEY=<your-service-account-key-json>
```

### Start the server

You can start the server using npm:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

Or use the provided start script:

```bash
./start.sh
```

If you need to kill any process running on port 3000:

```bash
npm run kill-port
```

### Access the application

You should be able to view the application locally at `http://localhost:3000/`.

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

## 🚀 Deployment to Render

### Quick Deploy

1. **Run the deployment script**:

   ```bash
   ./deploy.sh
   ```

2. **Follow the deployment guide**:

   - See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions

3. **Your app will be live at**:
   `https://your-app-name.onrender.com`

### Manual Deployment Steps

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Create Render Service**: Go to [render.com](https://render.com) and create a new Web Service
3. **Configure Settings**:
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Environment Variables**: Add `NODE_ENV=production`
5. **Upload Service Account**: Upload `privatekey.json` as a secret file
6. **Deploy**: Render will automatically build and deploy

### Testing Deployment

Visit these endpoints to verify your deployment:

- **Health Check**: `https://your-app.onrender.com/health`
- **Earth Engine Test**: `https://your-app.onrender.com/test-ee`
- **Main Application**: `https://your-app.onrender.com/`
- **Test Fixes**: `https://your-app.onrender.com/test-fixes`

## Testing

In a terminal window run these commands to test the Earth Engine connection:

```bash
cd google_maps_earth
node test-connection.js
```

You can also test the application by visiting these endpoints:

```bash
# Basic Earth Engine connection testing
http://localhost:3000/test

# Comprehensive testing for all implemented fixes
http://localhost:3000/test-fixes

# Global location testing for different climate zones
http://localhost:3000/test-global
```

## 🧪 Testing & Quality Assurance

### Recent Fixes Implemented

All major issues have been resolved:

- ✅ **Location Boundary Detection**: Temperature visualization now properly constrained to selected location boundaries
- ✅ **Temperature Particle Constraints**: Particles bounce within location boundaries instead of wrapping around
- ✅ **Wind Animation**: Working wind visualization in weather mode with fallback options
- ✅ **Legend Overlap Prevention**: Clean legend switching without overlapping elements
- ✅ **Immersive View Responsive**: Fully responsive UI/UX with proper mobile support

### Test Pages

- **`/test-fixes`**: Comprehensive testing for all implemented fixes
- **`/test-global`**: Global location testing for different climate zones
- **`/test`**: Basic Earth Engine connection testing

## 📊 Performance & Monitoring

### Production Optimizations

- Server-side caching of Earth Engine data
- Responsive design for all screen sizes
- Error handling and fallback mechanisms
- Health check endpoints for monitoring

### Global Support

- Works with any location worldwide (195+ countries)
- Administrative boundary support (countries, states, cities)
- Climate-appropriate temperature ranges based on latitude
- Multiple fallback mechanisms for data availability

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting issues and/or pull requests.

We welcome contributions to improve the Global Climate Visualization application!

## License

This project is licensed under the MIT License - please see [LICENSE](LICENSE) for more details.

## Roadmap

Please check out our [roadmap.md](roadmap.md) for details of upcoming features and development plans.

## Acknowledgments

- Google Earth Engine for climate data
- Google Maps Platform for visualization capabilities
- Render for reliable hosting and deployment
