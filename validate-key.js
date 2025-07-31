#!/usr/bin/env node

/**
 * Helper script to validate Google Earth Engine service account key
 * Usage: node validate-key.js [path-to-key-file]
 */

const fs = require('fs');
const path = require('path');

function validateKey(keyPath) {
  try {
    console.log(`Validating key file: ${keyPath}`);
    
    // Check if file exists
    if (!fs.existsSync(keyPath)) {
      console.error('❌ Key file does not exist');
      return false;
    }
    
    // Read and parse JSON
    const keyContent = fs.readFileSync(keyPath, 'utf8');
    const keyData = JSON.parse(keyContent);
    
    // Check required fields
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !keyData[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields.join(', '));
      return false;
    }
    
    // Check if it's a service account
    if (keyData.type !== 'service_account') {
      console.error('❌ Key type must be "service_account", got:', keyData.type);
      return false;
    }
    
    // Check private key format
    if (!keyData.private_key.includes('BEGIN PRIVATE KEY')) {
      console.error('❌ Private key appears to be in wrong format');
      return false;
    }
    
    console.log('✅ Key file is valid!');
    console.log(`   Project ID: ${keyData.project_id}`);
    console.log(`   Client Email: ${keyData.client_email}`);
    
    // Show how to set as environment variable
    console.log('\n📋 To set as environment variable in Render:');
    console.log('   Variable name: GOOGLE_EARTH_ENGINE_KEY');
    console.log('   Variable value: (copy the entire JSON content below)');
    console.log('\n' + '='.repeat(50));
    console.log(keyContent);
    console.log('='.repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error validating key:', error.message);
    return false;
  }
}

// Get key file path from command line or use default
const keyPath = process.argv[2] || './privatekey.json';
const fullPath = path.resolve(keyPath);

console.log('Google Earth Engine Key Validator');
console.log('='.repeat(40));

validateKey(fullPath);