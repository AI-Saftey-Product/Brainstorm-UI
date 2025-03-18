/**
 * WebSocket Service
 * Provides WebSocket connection functionality for real-time updates
 */

// WebSocket endpoint URL
const WS_URL = 'ws://51.20.87.231:8000/ws/tests/';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {
      'test_status_update': [],
      'test_result': [],
      'test_complete': [],
      'test_failed': [],
      'message': [],
      'error': [],
      'close': []
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  /**
   * Connect to the WebSocket server and subscribe to a specific task
   * @param {string} taskId - The task ID to subscribe to
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  connect(taskId) {
    return new Promise((resolve, reject) => {
      try {
        // Close any existing connection
        if (this.socket) {
          this.socket.close();
        }

        // Create new WebSocket connection
        this.socket = new WebSocket(`${WS_URL}${taskId}`);

        // Set up event handlers
        this.socket.onopen = () => {
          console.log('WebSocket connection established for task:', taskId);
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle different message types using switch as in the example
            if (data.type) {
              switch(data.type) {
                case 'test_status_update':
                  this.notifyListeners('test_status_update', data);
                  break;
                  
                case 'test_result':
                  this.notifyListeners('test_result', data);
                  break;
                  
                case 'test_complete':
                  this.notifyListeners('test_complete', data);
                  break;
                  
                case 'test_failed':
                  this.notifyListeners('test_failed', data);
                  break;
                  
                default:
                  // For any other message types
                  console.log('Unhandled message type:', data.type);
                  break;
              }
            }
            
            // Always notify generic message listeners
            this.notifyListeners('message', data);
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            console.error('Raw message:', event.data);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyListeners('error', error);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          this.notifyListeners('close', event);
          
          // Attempt to reconnect if not closed cleanly
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.connect(taskId).catch(console.error);
            }, 1000 * this.reconnectAttempts);
          }
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximum reconnection attempts reached');
            reject(new Error('Maximum reconnection attempts reached'));
          }
        };
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
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
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
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
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(callback);
    }
    return this; // For method chaining
  }

  /**
   * Remove a callback for a specific message type
   * @param {string} type - Message type
   * @param {Function} callback - Callback to remove
   */
  off(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear all listeners
    Object.keys(this.listeners).forEach(type => {
      this.listeners[type] = [];
    });
  }

  /**
   * Check if the WebSocket is currently connected
   * @returns {boolean} - Whether the WebSocket is connected
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService; 