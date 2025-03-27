/**
 * WebSocket Service
 * Provides WebSocket connection functionality for real-time updates
 */

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

  // Add an event listener
  on(type, callback) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(callback);
    return this;
  }

  // Remove an event listener
  off(type, callback) {
    if (this.eventHandlers[type]) {
      this.eventHandlers[type] = this.eventHandlers[type].filter(
        handler => handler !== callback
      );
    }
    return this;
  }

  // Notify all listeners of an event
  notifyListeners(type, data) {
    if (this.eventHandlers[type]) {
      this.eventHandlers[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error);
        }
      });
    }
  }

  // Connect to the WebSocket
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
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsEndpoint);
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          this.notifyListeners('open', {});
          resolve(this.ws);
        };
        
        this.ws.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);
          
          try {
            const data = JSON.parse(event.data);
            
            // Notify generic message handlers
            this.notifyListeners('message', data);
            
            // Notify specific message type handlers
            if (data.type) {
              this.notifyListeners(data.type, data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            // Notify with raw message if parsing fails
            this.notifyListeners('message', event.data);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyListeners('error', error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          this.notifyListeners('close', event);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  // Disconnect from the WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Reset the WebSocket service
  reset() {
    this.disconnect();
    this.eventHandlers = {};
    console.log('WebSocket service reset');
  }
}

// Create and export a singleton instance
const websocketService = new WebSocketService();
export default websocketService; 