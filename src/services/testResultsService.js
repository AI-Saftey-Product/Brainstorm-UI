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
    console.log('[RESULTS-DB] Opening IndexedDB database');
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[RESULTS-DB] Error opening database:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      console.log('[RESULTS-DB] Database opened successfully');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('[RESULTS-DB] Database upgrade needed, creating stores');
      const db = event.target.result;
      
      // Create the results store with a unique ID key
      if (!db.objectStoreNames.contains(RESULTS_STORE)) {
        const store = db.createObjectStore(RESULTS_STORE, { keyPath: 'id', autoIncrement: true });
        
        // Create an index for taskId lookups
        store.createIndex(TASK_ID_INDEX, 'taskId', { unique: false });
        
        // Create an index for timestamp-based sorting
        store.createIndex('byTimestamp', 'timestamp', { unique: false });
        
        console.log('[RESULTS-DB] Created test results store and indexes');
      }
    };
  });
  
  return dbPromise;
};

/**
 * Save test results to the database
 * @param {string} taskId - The task ID associated with the results
 * @param {Object} results - The test results object
 * @param {Object} scores - The compliance scores object
 * @returns {Promise<Object>} The saved record with its ID
 */
export const saveResults = async (taskId, results, scores) => {
  try {
    if (!taskId) {
      console.error('[RESULTS-DB] Cannot save results without a task ID');
      return null;
    }
    
    console.log(`[RESULTS-DB] Saving results for task ${taskId}`);
    
    // Create a record with metadata
    const record = {
      taskId,
      results,
      scores,
      timestamp: new Date().toISOString(),
      modelInfo: results?.modelInfo || {}
    };
    
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      
      // Save the record
      const request = store.add(record);
      
      request.onsuccess = (event) => {
        const savedRecord = { ...record, id: event.target.result };
        console.log(`[RESULTS-DB] Successfully saved results with ID ${event.target.result}`);
        resolve(savedRecord);
      };
      
      request.onerror = (event) => {
        console.error('[RESULTS-DB] Error saving results:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        console.log('[RESULTS-DB] Transaction completed');
      };
    });
  } catch (error) {
    console.error('[RESULTS-DB] Error in saveResults:', error);
    return null;
  }
};

/**
 * Get test results by task ID
 * @param {string} taskId - The task ID to look up
 * @returns {Promise<Object|null>} The test results or null if not found
 */
export const getResultsByTaskId = async (taskId) => {
  try {
    if (!taskId) {
      console.error('[RESULTS-DB] Cannot get results without a task ID');
      return null;
    }
    
    console.log(`[RESULTS-DB] Getting results for task ${taskId}`);
    
    try {
      const db = await initDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([RESULTS_STORE], 'readonly');
        const store = transaction.objectStore(RESULTS_STORE);
        const index = store.index(TASK_ID_INDEX);
        
        // Get all results with this task ID (should be just one)
        const request = index.getAll(taskId);
        
        request.onsuccess = (event) => {
          const results = event.target.result;
          if (results && results.length > 0) {
            // Return the most recent result if multiple exist
            const latestResult = results.sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            )[0];
            
            console.log(`[RESULTS-DB] Found ${results.length} results for task ${taskId}, using most recent`);
            resolve(latestResult);
          } else {
            console.log(`[RESULTS-DB] No results found for task ${taskId}`);
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          console.error('[RESULTS-DB] Error getting results:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (dbError) {
      console.error('[RESULTS-DB] Database error in getResultsByTaskId:', dbError);
      // Return null instead of rejecting to allow code to continue
      return null;
    }
  } catch (error) {
    console.error('[RESULTS-DB] Error in getResultsByTaskId:', error);
    return null;
  }
};

/**
 * Get the most recent test results
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of test results, ordered by most recent first
 */
export const getRecentResults = async (limit = 10) => {
  try {
    console.log(`[RESULTS-DB] Getting ${limit} most recent results`);
    
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readonly');
      const store = transaction.objectStore(RESULTS_STORE);
      const index = store.index('byTimestamp');
      
      // Use a cursor to get results in descending order
      const request = index.openCursor(null, 'prev');
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          console.log(`[RESULTS-DB] Retrieved ${results.length} recent results`);
          resolve(results);
        }
      };
      
      request.onerror = (event) => {
        console.error('[RESULTS-DB] Error getting recent results:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[RESULTS-DB] Error in getRecentResults:', error);
    return [];
  }
};

/**
 * Delete test results by ID
 * @param {number} id - The database ID of the results to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteResults = async (id) => {
  try {
    if (!id) {
      console.error('[RESULTS-DB] Cannot delete results without an ID');
      return false;
    }
    
    console.log(`[RESULTS-DB] Deleting results with ID ${id}`);
    
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(RESULTS_STORE);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`[RESULTS-DB] Successfully deleted results with ID ${id}`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('[RESULTS-DB] Error deleting results:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[RESULTS-DB] Error in deleteResults:', error);
    return false;
  }
};

// Export a check function to verify if IndexedDB is available
export const isDatabaseAvailable = () => {
  return !!window.indexedDB;
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
    console.log('[RESULTS-FB] Saved results to fallback storage for task:', taskId);
    return record;
  },
  
  getByTaskId: (taskId) => {
    const record = fallbackStorage.results.get(taskId);
    console.log('[RESULTS-FB] Retrieved results from fallback storage for task:', taskId);
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