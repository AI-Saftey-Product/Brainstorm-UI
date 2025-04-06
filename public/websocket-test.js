/**
 * WebSocket Connection Test Script
 * Run this in the browser console to test WebSocket connectivity 
 * independent of the React application.
 */

// Config (modify as needed)
const API_URL = 'http://localhost:8000'; // Default API URL
const WS_PATH = '/ws/tests';            // WebSocket path
const TEST_DURATION = 30000;            // Test duration in ms (30 seconds)

// Convert HTTP URL to WebSocket URL
const getWebSocketURL = (baseURL) => {
  return baseURL.replace(/^http/, 'ws').replace(/\/api$/, '');
};

// Function to test WebSocket connection
function testWebSocketConnection(taskId = null, debugMode = false) {
  console.log('=== WebSocket Connection Test ===');
  console.log(`API URL: ${API_URL}`);
  
  // Build WebSocket URL
  let wsEndpoint;
  const wsBaseUrl = getWebSocketURL(API_URL);
  
  if (taskId) {
    if (debugMode) {
      wsEndpoint = `${wsBaseUrl}${WS_PATH}/debug/${taskId}`;
      console.log(`Testing DEBUG connection to specific test run: ${taskId}`);
    } else {
      wsEndpoint = `${wsBaseUrl}${WS_PATH}/${taskId}`;
      console.log(`Testing connection to specific test run: ${taskId}`);
    }
  } else {
    wsEndpoint = `${wsBaseUrl}${WS_PATH}`;
    console.log('Testing connection to get a new test run ID');
  }
  
  console.log(`WebSocket endpoint: ${wsEndpoint}`);
  
  // Create WebSocket connection
  const ws = new WebSocket(wsEndpoint);
  
  // Connection opened
  ws.onopen = (event) => {
    console.log('✅ WebSocket connection OPENED successfully');
    console.log('ReadyState:', ws.readyState);
    console.log('Connection event:', event);
  };
  
  // Listen for messages
  ws.onmessage = (event) => {
    console.log('📩 Message received from server:');
    try {
      const data = JSON.parse(event.data);
      console.log('Parsed message:', data);
      
      // If we receive a test_run_id message, auto-start the debug test
      if (data.test_run_id && !taskId && !debugMode) {
        console.log(`Received test_run_id: ${data.test_run_id}`);
        console.log(`Auto-starting debug test with this ID...`);
        testWebSocketConnection(data.test_run_id, true);
      }
    } catch (e) {
      console.log('Raw message:', event.data);
    }
  };
  
  // Connection error
  ws.onerror = (error) => {
    console.error('❌ WebSocket Error:', error);
  };
  
  // Connection closed
  ws.onclose = (event) => {
    console.log('🔌 WebSocket connection closed:');
    console.log('Close event:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
  };
  
  // Schedule cleanup
  console.log(`Test will run for ${TEST_DURATION/1000} seconds...`);
  
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('Closing WebSocket connection after timeout');
      ws.close();
    }
    console.log('=== WebSocket Connection Test Complete ===');
  }, TEST_DURATION);
  
  return ws;
}

console.log('WebSocket test script loaded');
console.log('To test WebSocket connection:');
console.log('1. With a new test run: testWebSocketConnection()');
console.log('2. With existing test run ID: testWebSocketConnection("your-test-id")');

// Return the test function to the global scope
window.testWebSocketConnection = testWebSocketConnection; 