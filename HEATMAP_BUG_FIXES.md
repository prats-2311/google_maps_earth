# Heatmap Time-lapse Bug Analysis & Fixes

## Problem Description
The time-lapse visualization was showing the same heatmap data for every year when sliding between different years (e.g., 1998 → 1999 → 2000). Although the maps were loading, they appeared identical, preventing users from seeing the temporal changes in temperature data over Uttar Pradesh.

## Root Cause Analysis
After thorough investigation, the issue was identified as a **frontend tile caching problem**, not a backend filtering issue:

1. **Backend Working Correctly**: Server generates unique mapids for different years
   - Year 1998: `projects/earthengine-legacy/maps/5a17f1fb5ff2eb9ae76000a3502c9d18-...`
   - Year 1999: `projects/earthengine-legacy/maps/7485addeb69e332ac21539d3ef3bf2a1-...`
   - Year 2000: `projects/earthengine-legacy/maps/cf47a78625cf597b4b9374e5166efb15-...`

2. **Frontend Caching Issue**: Google Maps was caching tiles at the browser level, causing the same visual tiles to be displayed even when different mapids were provided.

## Fixes Applied

### 1. Backend Enhancements (Preventive)
Enhanced the Earth Engine filtering logic to be more explicit and robust:

#### Enhanced Date Filtering Logic
**Files Modified:** `server.js`
- **Before:** Simple chained filtering that might not be processed correctly
- **After:** Step-by-step filtering with explicit variable assignments and logging

```javascript
// OLD (potentially problematic)
const dataset = ee.ImageCollection('ECMWF/ERA5/DAILY')
  .filter(ee.Filter.date(`${year}-01-01`, `${year}-12-31`))
  .select('mean_2m_air_temperature');

// NEW (explicit and robust)
const collection = ee.ImageCollection('ECMWF/ERA5/DAILY');
const dateFiltered = collection.filter(ee.Filter.date(startDate, endDate));
const dataset = dateFiltered.select('mean_2m_air_temperature');
```

#### Comprehensive Logging & Verification
- Added detailed console logs to track each step of the filtering process
- Added verification of dataset size after filtering
- Added logging of date ranges being applied
- Added cache hit/miss logging with data details

#### Unique Computation Identifiers
- Added unique computation IDs to prevent Earth Engine-level caching issues
- Each request now has a timestamp-based identifier to ensure distinct computations

```javascript
const uniqueId = `temp_${year}_${Date.now()}`;
const tempWithId = tempCelsius.set('computation_id', uniqueId);
```

#### Cache Bypass Mechanism
- Added `nocache=true` query parameter to bypass application-level caching
- Useful for debugging and testing different years
- Frontend supports debug mode via `?debug=true` URL parameter

### 2. Frontend Fixes (Primary Solution)
The main issue was frontend tile caching. Applied aggressive cache-busting and refresh mechanisms:

#### Multi-Level Cache Busting
**Files Modified:** `public/js/app.js`

```javascript
// Multiple cache busting parameters
const cacheBuster = Date.now();
const randomId = Math.random().toString(36).substring(7);

// Applied to tile URLs
return `${baseUrl}&cb=${cacheBuster}&rid=${randomId}&year=${year}`;
```

#### Aggressive Map Refresh Mechanisms
1. **Overlay Management**: Complete clearing and recreation of map overlays
2. **Zoom Refresh**: Slight zoom adjustments to force tile reload
3. **Pan Refresh**: Minimal map panning to trigger tile refresh
4. **Resize Event**: Triggering Google Maps resize event

```javascript
// 1. Zoom refresh
map.setZoom(currentZoom + 0.01);
setTimeout(() => map.setZoom(currentZoom), 200);

// 2. Pan refresh
map.panTo({lat: lat + 0.0001, lng: lng + 0.0001});
setTimeout(() => map.panTo({lat: lat, lng: lng}), 300);

// 3. Force tile refresh
google.maps.event.trigger(map, 'resize');
```

#### Reduced Debouncing
- Reduced debounce delay from 250ms to 100ms for more responsive time-lapse
- Improved user experience when sliding through years

### 3. Debug & Testing Tools
- Added `/clear-cache` endpoint to manually clear the cache during testing
- Enhanced both `/ee-timelapse-layer` and `/ee-temp-layer` endpoints with debug capabilities
- Created `test-timelapse.js` script to verify unique mapid generation

## Testing Instructions

### 1. Clear Cache and Test
```bash
# Clear the cache
curl http://localhost:3000/clear-cache

# Test different years with cache bypass
curl "http://localhost:3000/ee-temp-layer?year=1980&nocache=true"
curl "http://localhost:3000/ee-temp-layer?year=2000&nocache=true"
curl "http://localhost:3000/ee-temp-layer?year=2020&nocache=true"
```

### 2. Backend Verification Test
```bash
# Run the automated test script
node test-timelapse.js

# Expected output:
# ✅ SUCCESS: All different!
# Unique mapids: 3/3
```

### 3. Frontend Debug Mode
- Access the application with debug mode: `http://localhost:3000?debug=true`
- This will bypass server-side caching and show detailed console logs
- Check browser console for detailed filtering and tile loading logs

### 4. Visual Verification
1. Open the application: `http://localhost:3000`
2. Move the year slider slowly between different years (e.g., 1998 → 1999 → 2000)
3. **Expected behavior**: Map should show different temperature patterns for each year
4. Check browser console for logs showing different mapids being loaded
5. Verify that tiles are being refreshed (you may see brief flashing as new tiles load)

## Expected Behavior After Fixes
- **Unique Data per Year**: Each year generates a unique Earth Engine computation with different mapid
- **Visual Differences**: Temperature maps show distinct patterns for different years reflecting actual climate variations
- **Responsive Time-lapse**: Smooth transitions when sliding through years with minimal delay
- **Cache Management**: Proper caching with unique identifiers, but aggressive refresh when needed
- **Debug Capabilities**: Comprehensive logging and cache bypass options for troubleshooting

## Verification Points
1. **Server Logs**: Different dataset sizes and mapids for different years
2. **Visual Differences**: Temperature maps show different patterns for different years
3. **Network Requests**: Different years result in different Earth Engine tile URLs with cache busters
4. **Browser Console**: Shows mapid changes and tile refresh operations
5. **User Experience**: Smooth, responsive time-lapse functionality

## Files Modified
- `server.js` - Enhanced both temperature endpoints with robust filtering and debugging
- `public/js/app.js` - Added aggressive cache-busting and map refresh mechanisms
- `test-timelapse.js` - Created automated testing script
- `HEATMAP_BUG_FIXES.md` - This comprehensive documentation

## Technical Summary
The time-lapse heatmap issue was primarily a **frontend tile caching problem** rather than a backend data filtering issue. The solution involved implementing multiple layers of cache-busting and map refresh mechanisms to ensure that Google Maps displays fresh tiles for each year's unique temperature data.

**Key Insight**: Google Maps aggressively caches tiles, so when implementing time-lapse visualizations with Earth Engine data, it's crucial to use multiple cache-busting strategies and force map refreshes to ensure visual updates are properly displayed to users.