#!/usr/bin/env node

/**
 * Test script to verify that different years return different mapids
 * This helps confirm that the time-lapse functionality is working correctly
 */

const http = require('http');

async function testYear(year) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/ee-temp-layer?year=${year}&nocache=true`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            year: year,
            success: result.success,
            mapid: result.mapid ? result.mapid.substring(0, 50) + '...' : 'N/A',
            fullMapid: result.mapid
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Time-lapse Functionality');
  console.log('=====================================');
  
  const testYears = [1998, 1999, 2000, 2001, 2002];
  const results = [];
  
  try {
    // Clear cache first
    console.log('🗑️  Clearing cache...');
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/clear-cache',
        method: 'GET'
      }, (res) => {
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log('✅ Cache cleared\n');
    
    // Test each year
    for (const year of testYears) {
      console.log(`🔍 Testing year ${year}...`);
      const result = await testYear(year);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Year ${year}: ${result.mapid}`);
      } else {
        console.log(`❌ Year ${year}: Failed`);
      }
    }
    
    console.log('\n📊 Results Summary:');
    console.log('==================');
    
    // Check if all mapids are unique
    const mapids = results.filter(r => r.success).map(r => r.fullMapid);
    const uniqueMapids = new Set(mapids);
    
    console.log(`Total years tested: ${testYears.length}`);
    console.log(`Successful responses: ${results.filter(r => r.success).length}`);
    console.log(`Unique mapids: ${uniqueMapids.size}`);
    
    if (uniqueMapids.size === mapids.length && mapids.length > 0) {
      console.log('🎉 SUCCESS: All years return unique mapids - Time-lapse is working!');
    } else if (uniqueMapids.size < mapids.length) {
      console.log('⚠️  WARNING: Some years return the same mapid - Time-lapse may not be working correctly');
      
      // Show which years have duplicate mapids
      const mapidCounts = {};
      results.forEach(r => {
        if (r.success) {
          mapidCounts[r.fullMapid] = mapidCounts[r.fullMapid] || [];
          mapidCounts[r.fullMapid].push(r.year);
        }
      });
      
      Object.entries(mapidCounts).forEach(([mapid, years]) => {
        if (years.length > 1) {
          console.log(`   Duplicate mapid for years: ${years.join(', ')}`);
        }
      });
    } else {
      console.log('❌ ERROR: No successful responses received');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
runTests();