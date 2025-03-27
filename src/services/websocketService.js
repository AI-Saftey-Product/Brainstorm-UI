/**
 * WebSocket Service
 * Provides WebSocket connection functionality for real-time updates
 */

import { Subject } from 'rxjs';

// Import the tests API URL for the test WebSocket
const TESTS_API_URL = import.meta.env.VITE_TESTS_API_URL || 'https://16.171.112.40';
console.log('Using Tests API URL:', TESTS_API_URL);

// Function to convert HTTP URL to WebSocket URL
function getWebSocketURL(url) {
  console.log('Converting URL to WebSocket URL:', url);
  const isProduction = import.meta.env.PROD;
  console.log('Is Production:', isProduction);
  
  // Replace http(s):// with ws(s)://
  const wsUrl = url.replace(/^http/, 'ws');
  console.log('Converted WebSocket URL:', wsUrl);
  
  return wsUrl;
}

// Create WebSocket URL
const TESTS_WS_URL = getWebSocketURL(TESTS_API_URL);
console.log('Using Tests WebSocket URL:', TESTS_WS_URL);

class WebSocketService {
  constructor() {
    this.ws = null;
    this.eventHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to the WebSocket server and subscribe to a specific task or get a new test run ID
   * @param {string} [taskId] - Optional taskId. If omitted, will connect to get a new test run ID
   * @returns {Promise} - A promise that resolves when connection is established
   */
  connect(taskId) {
    this.disconnect();
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = import.meta.env.VITE_TESTS_API_URL || 'https://16.171.112.40';
        let wsEndpoint;
        
        if (taskId) {
          const taskIdStr = String(taskId);
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests/${taskIdStr}`;
          console.log('Connecting to WebSocket with existing task ID:', wsEndpoint);
        } else {
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests`;
          console.log('Connecting to WebSocket to get a new test run ID:', wsEndpoint);
        }
        
        // Create WebSocket connection with proper headers
        this.ws = new WebSocket(wsEndpoint, [], {
          headers: {
            'Origin': 'https://aws-amplify.d1gdmj3u8tokdo.amplifyapp.com'
          }
        });
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          resolve(this.ws);
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
          this.reconnectAttempts++;
          if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.ws.close();
            reject(new Error('Max reconnect attempts reached'));
          } else {
            setTimeout(() => {
              this.connect(taskId);
            }, this.reconnectDelay);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          this.reconnectAttempts++;
          if (this.reconnectAttempts > this.maxReconnectAttempts) {
            reject(new Error('Max reconnect attempts reached'));
          } else {
            setTimeout(() => {
              this.connect(taskId);
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
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
    if (this.eventHandlers[type]) {
      this.eventHandlers[type].forEach(callback => {
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
      if (!this.eventHandlers[type]) {
        this.eventHandlers[type] = [];
      }
      this.eventHandlers[type].push(callback);
    }
    return this; // For method chaining
  }

  /**
   * Remove a callback for a specific message type
   * @param {string} type - Message type
   * @param {Function} callback - Callback to remove
   */
  off(type, callback) {
    if (this.eventHandlers[type]) {
      this.eventHandlers[type] = this.eventHandlers[type].filter(cb => cb !== callback);
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
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Reset and disconnect WebSocket, clearing all listeners
   */
  reset() {
    this.disconnect();
    this.eventHandlers = {};
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