/**
 * Earth Engine Connection Test Script
 * 
 * This script tests the connection to Google Earth Engine using the provided credentials.
 * It verifies that the authentication is working and that the ERA5 climate dataset is accessible.
 * 
 * Usage: node test-connection.js
 */

const ee = require('@google/earthengine');
const privateKey = require('./privatekey.json');

console.log('Testing connection to Google Earth Engine...');
console.log(`Using service account: ${privateKey.client_email}`);

// Initialize Earth Engine
ee.data.authenticateViaPrivateKey(privateKey, () => {
  console.log('✓ Authentication successful');
  
  ee.initialize(null, null, () => {
    console.log('✓ Earth Engine client library initialized');
    
    // Test with the ERA5 dataset (used in the application)
    console.log('Testing access to ERA5 climate dataset...');
    const dataset = ee.ImageCollection('ECMWF/ERA5/DAILY')
      .filter(ee.Filter.date('2020-01-01', '2020-12-31'));
    
    const meanTemp = dataset.select('mean_2m_air_temperature').mean();
    
    // Get the first image from the collection to verify
    dataset.first().getInfo((data) => {
      if (data && data.properties) {
        console.log('✓ Successfully accessed ERA5 dataset');
        console.log(`✓ Sample data from: ${new Date(data.properties['system:time_start']).toISOString().split('T')[0]}`);
        console.log('\nAll tests passed! Your Earth Engine connection is working correctly.');
        console.log('\nYou can now run the application with:');
        console.log('npm start');
      } else {
        console.error('✗ Failed to access ERA5 dataset data');
        console.error('Please check your Earth Engine account permissions');
      }
      process.exit(0);
    });
    
  }, (err) => {
    console.error('✗ Earth Engine client library failed to initialize', err);
    process.exit(1);
  });
}, (err) => {
  console.error('✗ Authentication failed', err);
  console.error('Please check your privatekey.json file and ensure your service account is registered for Earth Engine');
  process.exit(1);
});