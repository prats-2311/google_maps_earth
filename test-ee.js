const ee = require('@google/earthengine');
const privateKey = require('./privatekey.json');

// Initialize Earth Engine
ee.data.authenticateViaPrivateKey(privateKey, () => {
  console.log('Authentication successful');
  
  ee.initialize(null, null, () => {
    console.log('Earth Engine client library initialized');
    
    // Test with a simple Earth Engine operation
    const image = ee.Image('USGS/SRTMGL1_003');
    const info = image.getInfo();
    console.log('Image info:', JSON.stringify(info, null, 2));
    
    // Test with the ERA5 dataset
    const dataset = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date('2020-01-01', '2020-12-31'));
    
    const meanTemp = dataset.select('mean_2m_air_temperature').mean();
    console.log('ERA5 dataset loaded successfully');
    
    // Get the first image from the collection to verify
    dataset.first().getInfo((data) => {
      console.log('First image from ERA5:', JSON.stringify(data.properties, null, 2));
      process.exit(0);
    });
    
  }, (err) => {
    console.error('Earth Engine client library failed to initialize', err);
    process.exit(1);
  });
}, (err) => {
  console.error('Authentication failed', err);
  process.exit(1);
});