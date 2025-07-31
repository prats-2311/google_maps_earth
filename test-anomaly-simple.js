const express = require('express');
const path = require('path');

const app = express();
const port = 3001;

// Serve static files
app.use(express.static('public'));

// Simple test endpoint that returns mock anomaly data
app.get('/ee-anomaly-layer', (req, res) => {
  const year = parseInt(req.query.year) || 2000;
  
  // Return mock data that matches the expected format
  const mockResponse = {
    success: true,
    mapid: 'mock-anomaly-mapid-' + year,
    token: '',
    urlFormat: `https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/mock-anomaly-${year}/tiles/{z}/{x}/{y}`,
    year: year,
    dataType: 'anomaly',
    units: '°C difference from 1980-2000 baseline',
    source: 'ERA5 Daily Aggregates (Mock)',
    baseline: '1980-2000 average'
  };
  
  console.log(`Mock anomaly data for year ${year}:`, mockResponse);
  res.json(mockResponse);
});

// Test page
app.get('/test-anomaly-frontend', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Test Anomaly Frontend</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #map { width: 100%; height: 400px; border: 1px solid #ccc; }
        .controls { margin: 20px 0; }
        button { padding: 10px 15px; margin: 5px; cursor: pointer; }
        .result { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    </style>
</head>
<body>
    <h1>Anomaly Visualization Test</h1>
    
    <div class="controls">
        <button onclick="testAnomalyEndpoint()">Test Backend Endpoint</button>
        <button onclick="testFrontendVisualization()">Test Frontend Visualization</button>
        <select id="yearSelect">
            <option value="2000">2000</option>
            <option value="2010">2010</option>
            <option value="2020">2020</option>
        </select>
    </div>
    
    <div id="result" class="result"></div>
    <div id="map"></div>
    
    <script>
        let map;
        let currentVisualizationMode = 'anomaly';
        
        function initMap() {
            const defaultCenter = { lat: 20, lng: 0 }; // World center for global access
            map = new google.maps.Map(document.getElementById('map'), {
                center: defaultCenter,
                zoom: 7,
                mapTypeId: 'terrain'
            });
            console.log('Map initialized for anomaly test');
        }
        
        async function testAnomalyEndpoint() {
            const year = document.getElementById('yearSelect').value;
            const resultDiv = document.getElementById('result');
            
            try {
                const response = await fetch('/ee-anomaly-layer?year=' + year);
                const data = await response.json();
                
                resultDiv.innerHTML = '<strong>Backend Response:</strong><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                console.log('Anomaly endpoint response:', data);
            } catch (error) {
                resultDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
                console.error('Error testing endpoint:', error);
            }
        }
        
        async function testFrontendVisualization() {
            if (!map) {
                document.getElementById('result').innerHTML = '<strong>Error:</strong> Map not initialized';
                return;
            }
            
            const year = document.getElementById('yearSelect').value;
            const resultDiv = document.getElementById('result');
            
            try {
                // Fetch anomaly data
                const response = await fetch('/ee-anomaly-layer?year=' + year);
                const data = await response.json();
                
                if (data.success) {
                    // Test the tile URL generation logic from app.js
                    let getTileUrlFunction;
                    
                    if (data.urlFormat) {
                        console.log('Using urlFormat for anomaly:', data.urlFormat);
                        getTileUrlFunction = function(tile, zoom) {
                            const url = data.urlFormat
                                .replace('{z}', zoom)
                                .replace('{x}', tile.x)
                                .replace('{y}', tile.y);
                            console.log('Anomaly tile URL:', url);
                            return url;
                        };
                    } else {
                        console.log('Using legacy format for anomaly with mapid:', data.mapid);
                        getTileUrlFunction = function(tile, zoom) {
                            const baseUrl = 'https://earthengine.googleapis.com/map/' + data.mapid + '/' + zoom + '/' + tile.x + '/' + tile.y;
                            const token = data.token ? '?token=' + data.token : '';
                            const url = baseUrl + token;
                            console.log('Anomaly tile URL:', url);
                            return url;
                        };
                    }
                    
                    // Create tile source with high opacity for anomaly
                    const tileSource = new google.maps.ImageMapType({
                        name: 'Temperature Anomaly ' + year,
                        getTileUrl: getTileUrlFunction,
                        tileSize: new google.maps.Size(256, 256),
                        minZoom: 1,
                        maxZoom: 20,
                        opacity: 0.9  // High opacity for anomaly visibility
                    });
                    
                    // Clear existing overlays and add anomaly layer
                    map.overlayMapTypes.clear();
                    map.overlayMapTypes.insertAt(0, tileSource);
                    
                    resultDiv.innerHTML = '<strong>Success:</strong> Anomaly layer added to map for year ' + year + 
                                        '<br>Check browser console for tile loading logs.';
                    
                    console.log('Anomaly visualization loaded for year', year);
                } else {
                    resultDiv.innerHTML = '<strong>Error:</strong> ' + data.error;
                }
            } catch (error) {
                resultDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
                console.error('Error in visualization test:', error);
            }
        }
    </script>
    
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBR5_tFhPYuUTaaNgvPBbSzy8VnPSZTJNo&callback=initMap" async defer></script>
</body>
</html>
  `);
});

app.listen(port, () => {
  console.log(`Anomaly test server running at http://localhost:${port}`);
  console.log(`Test page: http://localhost:${port}/test-anomaly-frontend`);
});