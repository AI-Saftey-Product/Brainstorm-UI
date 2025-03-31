/**
 * WebSocket Service
 * Provides WebSocket connection functionality for real-time updates
 */

import { API_URL } from './api';

// Import the tests API URL for the test WebSocket
const TESTS_API_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

// Convert HTTP URL to WebSocket URL and remove /api suffix
const getWebSocketURL = (baseURL) => {
  return baseURL.replace(/^http/, 'ws').replace(/\/api$/, '');
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
    
    // DEBUG: Add a tracking ID for this WebSocket instance
    this.instanceId = Date.now();
    // Add a connection ID that changes with each new connection
    this.connectionId = null;
    // Track persisted handlers that should survive resets
    this.persistentHandlers = {
      'test_complete': [],
      'test_result': [],
      'message': []
    };
    console.log(`[WS-DEBUG] WebSocketService instance created: ${this.instanceId}`);
  }

  /**
   * Connect to the WebSocket server and subscribe to a specific task or get a new test run ID
   * @param {string} [taskId] - Optional taskId. If omitted, will connect to get a new test run ID
   * @returns {Promise} - A promise that resolves when connection is established
   */
  connect(taskId) {
    // Close any existing connection
    this.disconnect();
    
    // Generate a new connection ID for tracking
    this.connectionId = Date.now();
    
    // DEBUG: Track connection attempt
    console.log(`[WS-DEBUG][${this.instanceId}] Connecting to WebSocket with taskId: ${taskId || 'none'} (connectionId: ${this.connectionId})`);
    console.log(`[WS-DEBUG][${this.instanceId}] Current listener counts:`, Object.keys(this.eventListeners).map(key => 
      `${key}: ${this.eventListeners[key].length}`).join(', '));
    
    // Restore any persistent handlers
    this.restorePersistentHandlers();
    
    return new Promise((resolve, reject) => {
      try {
        // Use the correct WebSocket endpoint format based on whether we have a taskId
        const wsUrl = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
        let wsEndpoint;
        
        if (taskId) {
          // If we have a taskId, connect to the specific test run
          const taskIdStr = String(taskId);
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests/${taskIdStr}`;
          console.log(`[WS-DEBUG][${this.instanceId}] Connecting to WebSocket with existing task ID:`, wsEndpoint);
        } else {
          // If no taskId, connect to get a new test run ID
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests`;
          console.log(`[WS-DEBUG][${this.instanceId}] Connecting to WebSocket to get a new test run ID:`, wsEndpoint);
        }
        
        this.ws = new WebSocket(wsEndpoint);
        
        this.ws.onopen = () => {
          console.log(`[WS-DEBUG][${this.instanceId}] WebSocket connection established`);
          this.connected = true;
          
          // Log active listeners when connection is established
          this.logListenerState('Connection established (onopen)');
          
          if (taskId) {
            this.notifyListeners('connection_established', { taskId: String(taskId) });
            resolve({ taskId: String(taskId) });
          } else {
            // When connecting without a taskId, we expect the server to send us a test run ID
            // This will be handled in the onmessage handler
            console.log(`[WS-DEBUG][${this.instanceId}] WebSocket connection established, waiting for test run ID...`);
          }
        };
        
        this.ws.onmessage = (event) => {
          console.log(`[WS-DEBUG][${this.instanceId}] Raw WebSocket message received:`, event.data);
          
          // First, emit the raw message event with the raw data
          this.notifyListeners('raw_message', event.data);
          
          try {
            // Try to parse the message as JSON
            const data = JSON.parse(event.data);
            console.log(`[WS-DEBUG][${this.instanceId}] Parsed WebSocket message:`, data);
            
            // Always emit a generic 'message' event with the full data
            this.notifyListeners('message', data);
            
            // If we're waiting for a test run ID (no taskId was provided)
            if (!taskId && (data.test_run_id || data.id)) {
              const testRunId = data.test_run_id || data.id;
              console.log(`[WS-DEBUG][${this.instanceId}] Received test run ID from server:`, testRunId);
              this.notifyListeners('test_run_id', { test_run_id: testRunId });
              resolve({ test_run_id: testRunId });
            }
            
            // Then check for a message type and emit a specific event if present
            if (data.type) {
              console.log(`[WS-DEBUG][${this.instanceId}] Processing message of type: ${data.type}`);
              this.notifyListeners(data.type, data);
              
              // Special handling for test_complete messages to ensure they're processed
              if (data.type === 'test_complete') {
                console.log(`[WS-DEBUG][${this.instanceId}] Detected test_complete message, ensuring it's processed`);
                
                // Also notify as a 'message' event to make sure it's processed even if specific listeners aren't working
                this.notifyListeners('message', data);
                
                // And log the listeners count to help with debugging
                console.log(`[WS-DEBUG][${this.instanceId}] test_complete listeners: ${this.eventListeners['test_complete'].length}`);
                console.log(`[WS-DEBUG][${this.instanceId}] message listeners: ${this.eventListeners['message'].length}`);
              }
            } else {
              console.log(`[WS-DEBUG][${this.instanceId}] No message type found in WebSocket message`);
            }
          } catch (error) {
            console.error(`[WS-DEBUG][${this.instanceId}] Error parsing WebSocket message:`, error);
            
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
                  console.log(`[WS-DEBUG][${this.instanceId}] Extracted test run ID from raw message:`, extractedId);
                  this.notifyListeners('test_run_id', { test_run_id: extractedId });
                  resolve({ test_run_id: extractedId });
                }
              }
            }
          }
        };
        
        this.ws.onerror = (error) => {
          console.error(`[WS-DEBUG][${this.instanceId}] WebSocket error:`, error);
          this.connected = false;
          
          // Log active listeners when an error occurs
          this.logListenerState('WebSocket error (onerror)');
          
          this.notifyListeners('error', error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          console.log(`[WS-DEBUG][${this.instanceId}] WebSocket connection closed:`, event);
          this.connected = false;
          
          // Log active listeners when connection is closed
          this.logListenerState('Connection closed (onclose)');
          
          // Log additional details about the close event
          console.log(`[WS-DEBUG][${this.instanceId}] Close event details - wasClean: ${event.wasClean}, code: ${event.code}, reason: "${event.reason}"`);
          
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
        console.error(`[WS-DEBUG][${this.instanceId}] Error creating WebSocket connection:`, error);
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
    // DEBUG: Track notification attempt with more details
    const listenerCount = this.eventListeners[type]?.length || 0;
    console.log(`[WS-DEBUG][${this.instanceId}] NOTIFYING ${listenerCount} listeners for '${type}' event`);
    
    if (listenerCount > 0) {
      // Log the first few characters of the data for debugging
      try {
        const dataPreview = typeof data === 'object' 
          ? JSON.stringify(data).substring(0, 100) + '...' 
          : String(data).substring(0, 100) + '...';
        console.log(`[WS-DEBUG][${this.instanceId}] Event data preview: ${dataPreview}`);
      } catch (e) {
        console.log(`[WS-DEBUG][${this.instanceId}] Could not stringify event data for preview`);
      }
      
      // Log IDs of listeners being notified
      console.log(`[WS-DEBUG][${this.instanceId}] Notifying listeners with IDs:`);
      this.eventListeners[type].forEach((callback, index) => {
        console.log(`[WS-DEBUG][${this.instanceId}]   #${index + 1}: ID=${callback._trackingId || 'unknown'}, type=${callback._listenerType || type}`);
      });
    }
    
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WS-DEBUG][${this.instanceId}] Error in ${type} listener:`, error);
        }
      });
    }
  }

  /**
   * Register a callback for a specific message type
   * @param {string} type - Message type or event ('message', 'error', 'close', etc.)
   * @param {Function} callback - Function to call when this message type is received
   * @param {boolean} [persistent=false] - Whether this handler should persist across resets
   */
  on(type, callback, persistent = false) {
    if (typeof callback === 'function') {
      // Generate a unique ID for this callback for tracking
      const callbackId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Attach the ID to the function for tracking
      callback._trackingId = callbackId;
      callback._registeredAt = new Date().toISOString();
      callback._listenerType = type;
      callback._persistent = persistent;
      callback._connectionId = this.connectionId;
      
      // Capture stack trace to debug where this listener was registered
      const stack = new Error().stack;
      callback._registrationStack = stack;
      
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(callback);
      
      // If this is a persistent handler, also store it separately
      if (persistent && this.persistentHandlers[type]) {
        this.persistentHandlers[type].push(callback);
        console.log(`[WS-DEBUG][${this.instanceId}] Registered PERSISTENT listener for '${type}', ID: ${callbackId}`);
      }
      
      // DEBUG: Track listener registration with more details
      console.log(`[WS-DEBUG][${this.instanceId}] REGISTERED listener for '${type}', ID: ${callbackId}${persistent ? ' (persistent)' : ''}`);
      console.log(`[WS-DEBUG][${this.instanceId}] Listener registration stack trace:`, stack);
      console.log(`[WS-DEBUG][${this.instanceId}] Now have ${this.eventListeners[type].length} listeners for '${type}'`);
      
      // Log all current listeners for this type with their IDs
      if (this.eventListeners[type].length > 1) {
        console.log(`[WS-DEBUG][${this.instanceId}] All ${type} listeners:`);
        this.eventListeners[type].forEach((listener, index) => {
          console.log(`[WS-DEBUG][${this.instanceId}]   #${index + 1}: ID=${listener._trackingId || 'unknown'}, registered at ${listener._registeredAt || 'unknown'}`);
        });
      }
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
      const prevCount = this.eventListeners[type].length;
      
      // Log details about the callback being removed
      const callbackId = callback._trackingId || 'unknown';
      const registeredAt = callback._registeredAt || 'unknown';
      const isPersistent = callback._persistent || false;
      
      console.log(`[WS-DEBUG][${this.instanceId}] REMOVING listener for '${type}', ID: ${callbackId}, registered at: ${registeredAt}${isPersistent ? ' (persistent)' : ''}`);
      
      // Find and log the index of the callback being removed
      const callbackIndex = this.eventListeners[type].findIndex(cb => cb === callback);
      if (callbackIndex !== -1) {
        console.log(`[WS-DEBUG][${this.instanceId}] Found callback at index ${callbackIndex}`);
      } else {
        console.log(`[WS-DEBUG][${this.instanceId}] WARNING: Callback not found in listeners array! This is likely a bug.`);
        
        // Log all current listeners for this type
        console.log(`[WS-DEBUG][${this.instanceId}] Current ${type} listeners:`);
        this.eventListeners[type].forEach((listener, index) => {
          console.log(`[WS-DEBUG][${this.instanceId}]   #${index + 1}: ID=${listener._trackingId || 'unknown'}, registered at ${listener._registeredAt || 'unknown'}`);
        });
      }
      
      this.eventListeners[type] = this.eventListeners[type].filter(cb => cb !== callback);
      
      // Also remove from persistent handlers if present
      if (isPersistent && this.persistentHandlers[type]) {
        this.persistentHandlers[type] = this.persistentHandlers[type].filter(cb => cb !== callback);
      }
      
      // DEBUG: Track listener removal with more details
      console.log(`[WS-DEBUG][${this.instanceId}] Removed listener for '${type}', was ${prevCount}, now ${this.eventListeners[type].length} listeners`);
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
        // DEBUG: Track disconnect
        console.log(`[WS-DEBUG][${this.instanceId}] Disconnecting WebSocket, listeners will be preserved for reconnection`);
        this.ws.close(1000, 'Normal closure');
        this.connected = false;
      }
      this.ws = null;
    }
  }

  /**
   * Reset and disconnect WebSocket, clearing all listeners
   * @param {boolean} [preservePersistentHandlers=true] - Whether to preserve persistent handlers during reset
   */
  reset(preservePersistentHandlers = true) {
    // DEBUG: Track reset
    console.log(`[WS-DEBUG][${this.instanceId}] Resetting WebSocket service, clearing all listeners (preservePersistentHandlers: ${preservePersistentHandlers})`);
    
    // Log the listener state before reset
    this.logListenerState('Before reset');
    
    // Only disconnect if we have an active connection
    if (this.connected) {
      this.disconnect();
    }
    
    // Keep a reference to the old event listeners for debugging
    const oldEventListeners = { ...this.eventListeners };
    
    // Back up persistent handlers if requested
    let persistentHandlerBackup = {};
    if (preservePersistentHandlers) {
      // Clone the persistent handlers
      persistentHandlerBackup = JSON.parse(JSON.stringify(this.persistentHandlers));
      
      // Also find all handlers in the eventListeners that are marked as persistent
      Object.entries(this.eventListeners).forEach(([type, handlers]) => {
        if (!persistentHandlerBackup[type]) {
          persistentHandlerBackup[type] = [];
        }
        
        // Filter handlers that are marked as persistent
        const persistentOnes = handlers.filter(h => h._persistent);
        if (persistentOnes.length > 0) {
          console.log(`[WS-DEBUG][${this.instanceId}] Found ${persistentOnes.length} persistent handlers for ${type} to preserve`);
        }
      });
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
      'raw_message': []
    };
    
    // Restore persistent handlers if requested
    if (preservePersistentHandlers) {
      // This triggers the restore from the separate storage
      this.restorePersistentHandlers();
    } else {
      // If not preserving, also clear the persistent handlers storage
      this.persistentHandlers = {
        'test_complete': [],
        'test_result': [],
        'message': []
      };
    }
    
    // Log the previous and current listener counts
    console.log(`[WS-DEBUG][${this.instanceId}] Listener counts before reset:`);
    Object.entries(oldEventListeners).forEach(([type, listeners]) => {
      console.log(`[WS-DEBUG][${this.instanceId}]   ${type}: ${listeners.length} listeners`);
      
      // For important message types, log details about the listeners that were cleared
      if (['message', 'test_complete', 'test_result'].includes(type) && listeners.length > 0) {
        console.log(`[WS-DEBUG][${this.instanceId}] Cleared ${listeners.length} ${type} listeners:`);
        listeners.forEach((listener, index) => {
          console.log(`[WS-DEBUG][${this.instanceId}]   #${index + 1}: ID=${listener._trackingId || 'unknown'}, registered at ${listener._registeredAt || 'unknown'}, persistent: ${listener._persistent || false}`);
        });
      }
    });
    
    // Log the listener state after reset
    this.logListenerState('After reset');
    
    console.log(`[WS-DEBUG][${this.instanceId}] WebSocket service reset complete, non-persistent listeners cleared`);
    
    // Create a new instance ID to track the reset state
    this.instanceId = Date.now();
    console.log(`[WS-DEBUG] WebSocketService instance reset, new ID: ${this.instanceId}`);
  }

  /**
   * Check if the WebSocket is currently connected
   * @returns {boolean} - True if connected, false otherwise
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Helper method to get WebSocket URL from API URL
  getWebSocketURL(apiUrl) {
    if (!apiUrl) return null;
    
    // Convert http(s):// to ws(s)://
    return apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
  }

  /**
   * Log the current state of all listeners
   * @param {string} context - Context description for the log
   */
  logListenerState(context) {
    console.log(`[WS-DEBUG][${this.instanceId}] === LISTENER STATE: ${context} ===`);
    
    // Count total listeners
    let totalListeners = 0;
    Object.values(this.eventListeners).forEach(listeners => {
      totalListeners += listeners.length;
    });
    
    console.log(`[WS-DEBUG][${this.instanceId}] Total listeners: ${totalListeners}`);
    
    // Log counts by type
    Object.entries(this.eventListeners).forEach(([type, listeners]) => {
      if (listeners.length > 0) {
        console.log(`[WS-DEBUG][${this.instanceId}] ${type}: ${listeners.length} listeners`);
        
        // For important event types, log details of each listener
        if (['message', 'test_complete', 'test_result'].includes(type)) {
          listeners.forEach((listener, index) => {
            console.log(`[WS-DEBUG][${this.instanceId}]   #${index + 1}: ID=${listener._trackingId || 'unknown'}, registered at ${listener._registeredAt || 'unknown'}`);
          });
        }
      }
    });
    
    // Log connection state
    console.log(`[WS-DEBUG][${this.instanceId}] Connection state: ${this.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`[WS-DEBUG][${this.instanceId}] WebSocket readyState: ${this.ws ? this.ws.readyState : 'No WebSocket'}`);
  }

  /**
   * Process any message and ensure it triggers the appropriate listeners
   * This is a manual way to process a message if you suspect listeners aren't working
   * @param {Object|string} data - The message data to process
   */
  processMessage(data) {
    console.log(`[WS-DEBUG][${this.instanceId}] Manually processing message:`);
    
    try {
      // Parse message if it's a string
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.log(`[WS-DEBUG][${this.instanceId}] Could not parse message as JSON, using as-is`);
        }
      }
      
      // Log the data
      console.log(`[WS-DEBUG][${this.instanceId}] Message data:`, parsedData);
      
      // Always notify the message event
      this.notifyListeners('message', parsedData);
      
      // If there's a type, notify that specific event type
      if (parsedData && parsedData.type) {
        this.notifyListeners(parsedData.type, parsedData);
      }
      
      // Log the results
      this.logListenerState('After manually processing message');
    } catch (error) {
      console.error(`[WS-DEBUG][${this.instanceId}] Error manually processing message:`, error);
    }
  }

  /**
   * Restore persistent handlers after a reset or new connection
   */
  restorePersistentHandlers() {
    console.log(`[WS-DEBUG][${this.instanceId}] Restoring persistent handlers after reset/reconnect`);
    
    // Count how many handlers were restored
    let totalRestored = 0;
    
    // For each persistent handler type
    Object.entries(this.persistentHandlers).forEach(([type, handlers]) => {
      if (handlers.length > 0) {
        console.log(`[WS-DEBUG][${this.instanceId}] Restoring ${handlers.length} persistent handlers for ${type}`);
        
        // Update the connection ID on these handlers before restoring
        handlers.forEach(handler => {
          handler._connectionId = this.connectionId;
          handler._restoredAt = new Date().toISOString();
          
          // Add to the active listeners if not already there
          if (!this.eventListeners[type]) {
            this.eventListeners[type] = [];
          }
          
          // Check if this exact handler is already in the array
          const alreadyExists = this.eventListeners[type].some(h => h._trackingId === handler._trackingId);
          
          if (!alreadyExists) {
            this.eventListeners[type].push(handler);
            totalRestored++;
            console.log(`[WS-DEBUG][${this.instanceId}] Restored handler ID: ${handler._trackingId} for type: ${type}`);
          } else {
            console.log(`[WS-DEBUG][${this.instanceId}] Handler already exists, not duplicating: ${handler._trackingId} for type: ${type}`);
          }
        });
      }
    });
    
    console.log(`[WS-DEBUG][${this.instanceId}] Restored ${totalRestored} persistent handlers in total`);
  }

  /**
   * Register a persistent handler that will survive resets
   * @param {string} type - The event type
   * @param {Function} callback - The callback function
   * @returns {this} - For method chaining
   */
  persistentOn(type, callback) {
    return this.on(type, callback, true);
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService; 