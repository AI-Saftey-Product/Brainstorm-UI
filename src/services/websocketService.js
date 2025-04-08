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
      'raw_message': [],  // New event type for raw message data
      'model_input': [],  // New event type for model inputs
      'model_output': [], // New event type for model outputs
      'evaluation_result': [], // New event type for evaluation results
      'issue_found': []   // New event type for issues found
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.connected = false;
    
    // Add a tracking ID for this WebSocket instance
    this.instanceId = Date.now();
    // Add a connection ID that changes with each new connection
    this.connectionId = null;
    // Track persisted handlers that should survive resets
    this.persistentHandlers = {
      'test_complete': [],
      'test_result': [],
      'message': []
    };
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
    
    // Restore any persistent handlers
    this.restorePersistentHandlers();
    
    console.log('🔌 WEBSOCKET: Attempting to connect with taskId:', taskId);
    
    return new Promise((resolve, reject) => {
      try {
        // Use the correct WebSocket endpoint format based on whether we have a taskId
        const wsUrl = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
        let wsEndpoint;
        
        if (taskId) {
          // If we have a taskId, connect to the specific test run
          const taskIdStr = String(taskId);
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests/${taskIdStr}`;
        } else {
          // If no taskId, connect to get a new test run ID
          wsEndpoint = `${wsUrl.replace(/^http/, 'ws')}/ws/tests`;
        }
        
        console.log('🔌 WEBSOCKET: Connecting to endpoint:', wsEndpoint);
        this.ws = new WebSocket(wsEndpoint);
        
        this.ws.onopen = () => {
          this.connected = true;
          console.log('✅ WEBSOCKET: Connection OPENED successfully');
          console.log('✅ WEBSOCKET: readyState =', this.ws.readyState);
          
          // Log active listeners when connection is established
          this.logListenerState('Connection established (onopen)');
          
          if (taskId) {
            this.notifyListeners('connection_established', { taskId: String(taskId) });
            resolve({ taskId: String(taskId) });
          } else {
            // When connecting without a taskId, we expect the server to send us a test run ID
            // This will be handled in the onmessage handler
          }
        };
        
        this.ws.onmessage = (event) => {
          // Log every single raw message received
          console.log('📩 WEBSOCKET RAW MESSAGE RECEIVED:', event.data);
          
          // Always log the message type to diagnose message format issues
          try {
            const rawData = JSON.parse(event.data);
            console.log(`📩 WEBSOCKET MESSAGE TYPE: ${rawData.type || 'NO_TYPE'}`);
          } catch (e) {
            console.log('📩 WEBSOCKET NON-JSON MESSAGE:', event.data);
          }
          
          // First, emit the raw message event with the raw data
          this.notifyListeners('raw_message', event.data);
          
          try {
            // Try to parse the message as JSON
            const data = JSON.parse(event.data);
            
            console.log('📩 WEBSOCKET PARSED MESSAGE:', {
              type: data.type,
              timestamp: data.timestamp,
              message: data
            });
            
            // Log all raw messages to console
            console.log('[WebSocket Raw Message]:', data);
            
            // Log specific message types
            if (data.type === 'model_input') {
              console.log('[WebSocket Model Input]:', {
                test_id: data.test_id,
                prompt_type: data.prompt_type,
                prompt: data.prompt
              });
            } 
            else if (data.type === 'model_output') {
              console.log('[WebSocket Model Output]:', {
                test_id: data.test_id,
                output: data.output
              });
            }
            else if (data.type === 'evaluation_result') {
              console.log('[WebSocket Evaluation Result]:', {
                test_id: data.test_id,
                evaluation: data.evaluation
              });
            }
            else if (data.type === 'issue_found') {
              console.log('[WebSocket Issue Found]:', {
                test_id: data.test_id,
                issue_type: data.issue_type,
                details: data.details
              });
            }
            
            // Always emit a generic 'message' event with the full data
            this.notifyListeners('message', data);
            
            // If we're waiting for a test run ID (no taskId was provided)
            if (!taskId && (data.test_run_id || data.id)) {
              const testRunId = data.test_run_id || data.id;
              this.notifyListeners('test_run_id', { test_run_id: testRunId });
              resolve({ test_run_id: testRunId });
            }
            
            // Then check for a message type and emit a specific event if present
            if (data.type) {
              this.notifyListeners(data.type, data);
              
              // Special handling for test_complete messages to ensure they're processed
              if (data.type === 'test_complete') {
                // Also notify as a 'message' event to make sure it's processed even if specific listeners aren't working
                this.notifyListeners('message', data);
              }
            }
          } catch (error) {
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
                  this.notifyListeners('test_run_id', { test_run_id: extractedId });
                  resolve({ test_run_id: extractedId });
                }
              }
            }
          }
        };
        
        this.ws.onerror = (error) => {
          this.connected = false;
          
          console.error('❌ WEBSOCKET ERROR:', error);
          console.error('❌ WEBSOCKET readyState =', this.ws.readyState);
          
          // Log active listeners when an error occurs
          this.logListenerState('WebSocket error (onerror)');
          
          this.notifyListeners('error', error);
          reject(error);
        };
        
        this.ws.onclose = (event) => {
          this.connected = false;
          
          console.log('🔌 WEBSOCKET CLOSED:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            readyState: this.ws.readyState
          });
          
          // Log active listeners when connection is closed
          this.logListenerState('Connection closed (onclose)');
          
          this.notifyListeners('close', event);
          
          // Only reject if we're still waiting for a test run ID
          if (!taskId && !event.wasClean) {
            reject(new Error('WebSocket connection closed before receiving test run ID'));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Notify all listeners of a specific event type
   * @param {string} type - The event type
   * @param {any} data - The event data
   */
  notifyListeners(type, data) {
    // Skip if there are no listeners
    const listeners = this.eventListeners[type] || [];
    if (listeners.length === 0) {
      return;
    }
    
    const listenerCount = listeners.length;
    
    // Create a data preview for debugging
    let dataPreview = '';
    try {
      const strData = JSON.stringify(data);
      dataPreview = strData.length > 100 ? `${strData.substring(0, 100)}...` : strData;
    } catch (e) {
      // Ignore stringify errors
    }
    
    // Call each listener
    for (let index = 0; index < listeners.length; index++) {
      const callback = listeners[index];
      try {
        callback(data);
      } catch (error) {
        // Continue to next listener if one fails
      }
    }
  }

  /**
   * Register an event listener
   * @param {string} type - The event type
   * @param {Function} callback - The callback function
   * @param {boolean} persistent - Whether the handler survives resets
   * @returns {Function} - A function to remove the listener
   */
  on(type, callback, persistent = false) {
    // Create a copy of the callback with tracking information
    const trackedCallback = (...args) => callback(...args);
    trackedCallback._trackingId = Date.now() + Math.random().toString(36).substring(2, 7);
    trackedCallback._registeredAt = new Date().toISOString();
    trackedCallback._listenerType = type;
    trackedCallback._persistent = persistent;
    
    // Store extra tracking data on the stack trace
    const stack = new Error().stack;
    trackedCallback._stackTrace = stack;
    
    // Ensure the event type exists in the eventListeners object
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    
    // Add the tracked callback to the event listeners
    this.eventListeners[type].push(trackedCallback);
    
    // If this is a persistent handler, also store it separately
    if (persistent) {
      if (!this.persistentHandlers[type]) {
        this.persistentHandlers[type] = [];
      }
      this.persistentHandlers[type].push(trackedCallback);
    }
    
    // Return a function to remove the listener
    return () => this.off(type, trackedCallback);
  }

  /**
   * Remove an event listener
   * @param {string} type - The event type
   * @param {Function} callback - The callback function to remove
   */
  off(type, callback) {
    if (!this.eventListeners[type]) {
      return;
    }
    
    const listeners = this.eventListeners[type];
    const callbackId = callback._trackingId || 'untracked';
    const registeredAt = callback._registeredAt || 'unknown';
    const isPersistent = callback._persistent || false;
    
    // Find the callback in the listeners array
    const callbackIndex = listeners.findIndex(listener => listener === callback || listener._trackingId === callbackId);
    
    if (callbackIndex !== -1) {
      // Remove the callback from the array
      const prevCount = listeners.length;
      this.eventListeners[type] = listeners.filter((_, index) => index !== callbackIndex);
      
      // Also remove from persistent handlers if needed
      if (isPersistent && this.persistentHandlers[type]) {
        this.persistentHandlers[type] = this.persistentHandlers[type].filter(
          handler => handler !== callback && handler._trackingId !== callbackId
        );
      }
    }
  }

  /**
   * Send data to the WebSocket server
   * @param {any} data - The data to send
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.connected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Reset the WebSocket service, optionally preserving persistent handlers
   * @param {boolean} preservePersistentHandlers - Whether to preserve persistent handlers
   */
  reset(preservePersistentHandlers = true) {
    // Disconnect from the server
    this.disconnect();
    
    // Create a copy of persistent handlers if needed
    const persistentToBeCopied = {};
    if (preservePersistentHandlers) {
      // For each event type that has persistent handlers
      Object.keys(this.persistentHandlers).forEach(type => {
        // Get the persistent handlers for this type
        const handlers = this.persistentHandlers[type] || [];
        
        // If there are any, copy them
        if (handlers.length > 0) {
          persistentToBeCopied[type] = [...handlers];
        }
      });
    }
    
    // Clear all event listeners
    this._clearAllListeners();
    
    // Restore persistent handlers if needed
    if (preservePersistentHandlers) {
      for (const type in persistentToBeCopied) {
        const persistentOnes = persistentToBeCopied[type] || [];
        if (persistentOnes.length > 0) {
          // Make sure the event type exists
          if (!this.eventListeners[type]) {
            this.eventListeners[type] = [];
          }
          if (!this.persistentHandlers[type]) {
            this.persistentHandlers[type] = [];
          }
          
          // Add each persistent handler back
          persistentOnes.forEach(handler => {
            this.eventListeners[type].push(handler);
            this.persistentHandlers[type].push(handler);
          });
        }
      }
    }
    
    // Reset other properties
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Generate a new instance ID
    this.instanceId = Date.now();
  }

  /**
   * Clear all event listeners
   * @private
   */
  _clearAllListeners() {
    // For each event type
    Object.keys(this.eventListeners).forEach(type => {
      const listeners = this.eventListeners[type] || [];
      
      // Clear the listeners array
      this.eventListeners[type] = [];
      
      // Also clear persistent handlers if they exist
      if (this.persistentHandlers[type]) {
        this.persistentHandlers[type] = [];
      }
    });
  }

  /**
   * Check if the WebSocket is connected
   * @returns {boolean} - Whether the WebSocket is connected
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get the WebSocket URL for a given API URL
   * @param {string} apiUrl - The API URL
   * @returns {string} - The WebSocket URL
   */
  getWebSocketURL(apiUrl) {
    return apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
  }

  /**
   * Log the current state of all event listeners
   * @param {string} context - A description of when this log is being created
   */
  logListenerState(context) {
    // Calculate total listeners
    let totalListeners = 0;
    
    // For each event type
    Object.keys(this.eventListeners).forEach(type => {
      const listeners = this.eventListeners[type] || [];
      totalListeners += listeners.length;
    });
  }

  /**
   * Process a message manually (useful for testing or replaying messages)
   * @param {any} data - The message data
   */
  processMessage(data) {
    try {
      // If the data is a string, try to parse it as JSON
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // If parsing fails, use the data as-is
        }
      }
      
      // Notify listeners of the raw message
      this.notifyListeners('raw_message', data);
      
      // Notify listeners of the general message
      this.notifyListeners('message', parsedData);
      
      // If the data has a type, notify type-specific listeners
      if (parsedData && parsedData.type) {
        this.notifyListeners(parsedData.type, parsedData);
      }
    } catch (error) {
      // Ignore errors during message processing
    }
  }

  /**
   * Restore persistent handlers after a reset or reconnect
   */
  restorePersistentHandlers() {
    let totalRestored = 0;
    
    // For each event type
    Object.keys(this.persistentHandlers).forEach(type => {
      const handlers = this.persistentHandlers[type] || [];
      
      // If there are handlers to restore
      if (handlers.length > 0) {
        // Ensure the event type exists
        if (!this.eventListeners[type]) {
          this.eventListeners[type] = [];
        }
        
        // For each handler
        handlers.forEach(handler => {
          // Check if the handler already exists to avoid duplicates
          const existingIndex = this.eventListeners[type].findIndex(
            listener => listener._trackingId === handler._trackingId
          );
          
          // If it doesn't exist, add it
          if (existingIndex === -1) {
            this.eventListeners[type].push(handler);
            totalRestored++;
          }
        });
      }
    });
  }

  /**
   * Register a persistent event listener that survives resets
   * @param {string} type - The event type
   * @param {Function} callback - The callback function
   * @returns {Function} - A function to remove the listener
   */
  persistentOn(type, callback) {
    return this.on(type, callback, true);
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService; 