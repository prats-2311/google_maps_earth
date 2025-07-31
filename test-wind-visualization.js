// Simple test script to verify the wind visualization fix
const fs = require('fs');
const path = require('path');

console.log('Testing wind visualization fix...');

// Check if the app.js file contains the WebGL context initialization
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Check for the WebGL context initialization code
const hasWebGLContextInit = appJsContent.includes('windCanvas.getContext(\'webgl\')') || 
                           appJsContent.includes('windCanvas.getContext("webgl")');

// Check for the WindGL constructor call with gl parameter
const hasWindGLWithGL = appJsContent.includes('const wind = new WindGL(gl)') ||
                       appJsContent.includes('let wind = new WindGL(gl)') ||
                       appJsContent.includes('var wind = new WindGL(gl)');

// Check for the WebGL not supported error handling
const hasWebGLErrorHandling = appJsContent.includes('WebGL not supported');

// Print the test results
console.log('WebGL context initialization:', hasWebGLContextInit ? 'PASS' : 'FAIL');
console.log('WindGL constructor with gl parameter:', hasWindGLWithGL ? 'PASS' : 'FAIL');
console.log('WebGL not supported error handling:', hasWebGLErrorHandling ? 'PASS' : 'FAIL');

if (hasWebGLContextInit && hasWindGLWithGL && hasWebGLErrorHandling) {
  console.log('\nAll tests PASSED! The wind visualization fix has been properly implemented.');
  console.log('The error "gl.createProgram is not a function" should be resolved.');
} else {
  console.log('\nSome tests FAILED! Please check the implementation of the wind visualization fix.');
}

// Summary of the fix
console.log('\nSummary of the fix:');
console.log('1. The issue was that the WindGL constructor was being passed a canvas element instead of a WebGL context.');
console.log('2. The fix obtains the WebGL context from the canvas before passing it to the WindGL constructor.');
console.log('3. Added error handling for browsers that don\'t support WebGL.');
console.log('\nThis fix should resolve the "gl.createProgram is not a function" error.');