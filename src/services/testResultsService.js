/**
 * Test Results Service
 * Provides persistent storage and retrieval of test results using IndexedDB
 */

// Database configuration
const DB_NAME = 'brainstormTestsDB';
const DB_VERSION = 1;
const RESULTS_STORE = 'testResults';
const TASK_ID_INDEX = 'byTaskId';

// Initialize the database
let dbPromise;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance
 */
const initDatabase = () => {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create the results store with a unique ID key
      if (!db.objectStoreNames.contains(RESULTS_STORE)) {
        const store = db.createObjectStore(RESULTS_STORE, { keyPath: 'id', autoIncrement: true });
        
        // Create an index for taskId lookups
        store.createIndex(TASK_ID_INDEX, 'taskId', { unique: false });
        
        // Create an index for timestamp-based sorting
        store.createIndex('byTimestamp', 'timestamp', { unique: false });
      }
    };
  });
  
  return dbPromise;
};

/**
 * Check if IndexedDB is available in the current environment
 * @returns {boolean} Whether IndexedDB is available
 */
const isDatabaseAvailable = () => {
  return typeof indexedDB !== 'undefined';
};

/**
 * Save test results to the database
 * @param {string} taskId - The task ID associated with the results
 * @param {Object} results - The test results data
 * @param {Object} scores - Optional compliance scores
 * @returns {Promise<Object>} The saved record with an ID
 */
const saveResults = async (taskId, results, scores = {}) => {
  if (!taskId) {
    throw new Error('Task ID is required to save results');
  }
  
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      
      // Create a record to store
      const record = {
        taskId,
        results,
        scores,
        timestamp: new Date().toISOString(),
      };
      
      // Add to the store
      const request = store.add(record);
      
      request.onsuccess = (event) => {
        // Update the record with the generated ID
        record.id = event.target.result;
        resolve(record);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        // Transaction completed successfully
      };
      
      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    // Throw any error that occurs
    throw error;
  }
};

/**
 * Get results for a specific task ID
 * @param {string} taskId - The task ID to retrieve results for
 * @returns {Promise<Object|null>} The results record or null if not found
 */
const getResultsByTaskId = async (taskId) => {
  if (!taskId) {
    throw new Error('Task ID is required to get results');
  }
  
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readonly');
      const store = transaction.objectStore(RESULTS_STORE);
      const index = store.index(TASK_ID_INDEX);
      
      // Get all results matching the taskId
      const request = index.getAll(taskId);
      
      request.onsuccess = (event) => {
        const results = event.target.result;
        if (results && results.length > 0) {
          // Sort by timestamp (newest first) and return the most recent
          results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          resolve(results[0]);
        } else {
          // No results found
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    // Throw any error that occurs
    throw error;
  }
};

/**
 * Get recent test results
 * @param {number} limit - Maximum number of results to retrieve
 * @returns {Promise<Array>} Array of recent results
 */
const getRecentResults = async (limit = 10) => {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readonly');
      const store = transaction.objectStore(RESULTS_STORE);
      const index = store.index('byTimestamp');
      
      // Get all results
      const request = index.openCursor(null, 'prev');
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    // Throw any error that occurs
    throw error;
  }
};

/**
 * Delete a results record by ID
 * @param {number} id - The ID of the record to delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
const deleteResults = async (id) => {
  if (!id) {
    throw new Error('Result ID is required to delete');
  }
  
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      
      // Delete the record
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    // Throw any error that occurs
    throw error;
  }
};

// For browsers or environments without IndexedDB, provide fallback storage
const fallbackStorage = {
  results: new Map(),
  
  save: (taskId, results, scores) => {
    const record = {
      taskId,
      results,
      scores,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    fallbackStorage.results.set(taskId, record);
    return record;
  },
  
  getByTaskId: (taskId) => {
    const record = fallbackStorage.results.get(taskId);
    return record || null;
  },
  
  getRecent: (limit) => {
    return Array.from(fallbackStorage.results.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },
  
  delete: (id) => {
    // Find by ID and delete
    for (const [key, value] of fallbackStorage.results.entries()) {
      if (value.id === id) {
        fallbackStorage.results.delete(key);
        return true;
      }
    }
    return false;
  }
};

// Create a unified API that uses IndexedDB if available, otherwise fallback
export default {
  saveResults: async (taskId, results, scores) => {
    if (isDatabaseAvailable()) {
      return saveResults(taskId, results, scores);
    } else {
      return fallbackStorage.save(taskId, results, scores);
    }
  },
  
  getResultsByTaskId: async (taskId) => {
    if (isDatabaseAvailable()) {
      return getResultsByTaskId(taskId);
    } else {
      return fallbackStorage.getByTaskId(taskId);
    }
  },
  
  getRecentResults: async (limit = 10) => {
    if (isDatabaseAvailable()) {
      return getRecentResults(limit);
    } else {
      return fallbackStorage.getRecent(limit);
    }
  },
  
  deleteResults: async (id) => {
    if (isDatabaseAvailable()) {
      return deleteResults(id);
    } else {
      return fallbackStorage.delete(id);
    }
  }
}; 