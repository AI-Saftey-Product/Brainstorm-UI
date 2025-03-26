/**
 * WebSocket Service
 * Provides WebSocket connection functionality for real-time updates
 */

import { API_URL } from './api';

// Import the tests API URL for the test WebSocket
const TESTS_API_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

// Function to convert HTTP URL to WebSocket URL
const getWebSocketURL = (httpUrl) => {
  if (!httpUrl) return null;
  
  // Create a URL object to parse the HTTP URL
  const url = new URL(httpUrl);
  
  // Determine the WebSocket protocol (ws or wss)
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Construct the WebSocket URL
  // If it's an IP address with port, preserve the port
  const wsUrl = `${wsProtocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
  
  console.log('Converting HTTP URL to WebSocket URL:', {
    original: httpUrl,
    converted: wsUrl
  });
  
  return wsUrl;
};

// Main API WebSocket URL (port 3001)
const API_WS_URL = getWebSocketURL(API_URL);

// Tests API WebSocket URL (port 8000)
const TESTS_WS_URL = getWebSocketURL(TESTS_API_URL);

class WebSocketService {
  constructor() {
    this.eventListeners = {
      'test_status_update': [],
      'test_result': [],
      'test_complete': [],
      'test_failed': [],
      'message': [],
      'error': [],
      'close': [],
      'connection': [],
      'connection_established': [],
      'raw_message': []  // New event type for raw message data
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.connected = false;
  }

  /**
   * Connect to the WebSocket server and subscribe to a specific task or get a new test run ID
   * @param {string} [taskId] - Optional taskId. If omitted, will connect to get a new test run ID
   * @returns {Promise} - A promise that resolves when connection is established
   */
  connect(taskId) {
    // Close any existing connection
    this.disconnect();
    
    return new Promise((resolve, reject) => {
      try {
        // Use the correct WebSocket endpoint format based on whether we have a taskId
        const wsUrl = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
        let wsEndpoint;
        
        if (taskId) {
          // If we have a taskId, connect to the specific test run
          const taskIdStr = String(taskId);
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests/${taskIdStr}`;
          console.log('Connecting to WebSocket with existing task ID:', wsEndpoint);
        } else {
          // If no taskId, connect to get a new test run ID
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests`;
          console.log('Connecting to WebSocket to get a new test run ID:', wsEndpoint);
        }
        
        this.ws = new WebSocket(wsEndpoint);
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.connected = true;
          
          if (taskId) {
            this.notifyListeners('connection_established', { taskId: String(taskId) });
            resolve({ taskId: String(taskId) });
          } else {
            // When connecting without a taskId, we expect the server to send us a test run ID
            // This will be handled in the onmessage handler
            console.log('WebSocket connection established, waiting for test run ID...');
          }
        };
        
        this.ws.onmessage = (event) => {
          console.log('Raw WebSocket message received:', event.data);
          
          // First, emit the raw message event with the raw data
          this.notifyListeners('raw_message', event.data);
          
          try {
            // Try to parse the message as JSON
            const data = JSON.parse(event.data);
            console.log('Parsed WebSocket message:', data);
            
            // Always emit a generic 'message' event with the full data
            this.notifyListeners('message', data);
            
            // If we're waiting for a test run ID (no taskId was provided)
            if (!taskId && (data.test_run_id || data.id)) {
              const testRunId = data.test_run_id || data.id;
              console.log('Received test run ID from server:', testRunId);
              this.notifyListeners('test_run_id', { test_run_id: testRunId });
              resolve({ test_run_id: testRunId });
            }
            
            // Then check for a message type and emit a specific event if present
            if (data.type) {
              console.log(`Processing message of type: ${data.type}`);
              this.notifyListeners(data.type, data);
            } else {
              console.log('No message type found in WebSocket message');
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            
            // If parsing fails, still emit the message event with the raw data
            this.notifyListeners('message', event.data);
            
            // If we're waiting for a test run ID and encounter an error, try to extract from raw data
            if (!taskId) {
              const rawData = event.data;
              if (typeof rawData === 'string') {
                // Try to extract test_run_id using regex
                const match = rawData.match(/test_run_id[\":][\"\s]*([a-zA-Z0-9-_]+)/);
                if (match && match[1]) {
                  const extractedId = match[1].replace(/[\"']/g, '');
                  console.log('Extracted test run ID from raw message:', extractedId);
                  this.notifyListeners('test_run_id', { test_run_id: extractedId });
                  resolve({ test_run_id: extractedId });
                }
              }
            }
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
          this.notifyListeners('error', error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          this.connected = false;
          this.notifyListeners('close', event);
          
          // Only reject if we're still waiting for a test run ID
          if (!taskId && !event.wasClean) {
            reject(new Error('WebSocket connection closed before receiving test run ID'));
          }
        };
        
        // Set a timeout for getting the test run ID
        if (!taskId) {
          setTimeout(() => {
            reject(new Error('Timeout waiting for test run ID'));
          }, 10000);
        }
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.notifyListeners('error', error);
        reject(error);
      }
    });
  }

  /**
   * Notify all listeners of a specific event type
   * @param {string} type - Event type
   * @param {any} data - Event data
   */
  notifyListeners(type, data) {
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${type} listener:`, error);
        }
      });
    }
  }

  /**
   * Register a callback for a specific message type
   * @param {string} type - Message type or event ('message', 'error', 'close', etc.)
   * @param {Function} callback - Function to call when this message type is received
   */
  on(type, callback) {
    if (typeof callback === 'function') {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(callback);
    }
    return this; // For method chaining
  }

  /**
   * Remove a callback for a specific message type
   * @param {string} type - Message type
   * @param {Function} callback - Callback to remove
   */
  off(type, callback) {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(cb => cb !== callback);
    }
    return this;
  }

  /**
   * Send a message through the WebSocket
   * @param {Object} data - Data to send
   * @returns {boolean} - Whether the message was sent successfully
   */
  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      // Only close if we're actually connected
      if (this.connected) {
        this.ws.close(1000, 'Normal closure');
        this.connected = false;
        console.log('WebSocket disconnected, listeners will be preserved for reconnection');
      }
      this.ws = null;
    }
  }

  /**
   * Reset and disconnect WebSocket, clearing all listeners
   */
  reset() {
    // Only disconnect if we have an active connection
    if (this.connected) {
      this.disconnect();
    }
    // Clear all listeners
    this.eventListeners = {
      'test_status_update': [],
      'test_result': [],
      'test_complete': [],
      'test_failed': [],
      'message': [],
      'error': [],
      'close': [],
      'connection': [],
      'connection_established': [],
      'raw_message': []  // New event type for raw message data
    };
    console.log('WebSocket service completely reset, all listeners cleared');
  }

  /**
   * Check if the WebSocket is currently connected
   * @returns {boolean} - Whether the WebSocket is connected
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  // Helper method to get WebSocket URL from API URL
  getWebSocketURL(apiUrl) {
    if (!apiUrl) return null;
    
    // Convert http(s):// to ws(s)://
    return apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService; 