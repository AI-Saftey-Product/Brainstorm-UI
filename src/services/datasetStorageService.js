/**
 * Dataset Storage Service
 * Manages saved dataset configurations 
 */

const SAVED_DATASETS_KEY = 'savedDatasetConfigs';

/**
 * Save a new dataset configuration
 * @param {Object} config - Dataset configuration
 * @returns {Object} Saved configuration with metadata
 */
export const saveDatasetConfig = (config) => {
  try {
    console.log('Saving dataset config:', config);
    
    // Get existing configs
    const savedConfigs = getSavedDatasetConfigs();
    const timestamp = new Date().toISOString();
    
    // Check if we're updating an existing config
    const isUpdate = config.id && savedConfigs.some(c => c.id === config.id);
    
    let configWithMeta;
    
    if (isUpdate) {
      // Update existing config
      console.log('Updating existing dataset:', config.id);
      return updateDatasetConfig(config.id, config);
    } else {
      // Add new config
      configWithMeta = {
        ...config,
        // Add normalized fields
        name: config.name || 'Unnamed Dataset',
        description: config.description || '',
        source: config.source || 'huggingface', // 'huggingface' or 'custom'
        dataset_id: config.dataset_id || '',
        split: config.split || 'test',
        api_key: config.api_key || '',
        column_mapping: config.column_mapping || {},
        sampling: config.sampling || 'random', // 'random', 'sequential', etc.
        sample_size: config.sample_size || 100,
        // Add metadata
        id: config.id || `dataset_${Date.now()}`,
        createdAt: config.createdAt || timestamp,
        lastModified: timestamp
      };
      
      savedConfigs.push(configWithMeta);
      console.log('Saving to localStorage:', savedConfigs);
      localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify(savedConfigs));
      
      // Verify the save worked
      const verifyConfigs = JSON.parse(localStorage.getItem(SAVED_DATASETS_KEY) || '[]');
      console.log(`Save verified: Found ${verifyConfigs.length} datasets in localStorage`);
      
      return configWithMeta;
    }
  } catch (error) {
    console.error('Error saving dataset config:', error);
    throw error;
  }
};

/**
 * Get all saved dataset configurations
 * @returns {Array} Array of saved dataset configurations
 */
export const getSavedDatasetConfigs = () => {
  try {
    const storedData = localStorage.getItem(SAVED_DATASETS_KEY);
    console.log('Retrieved from localStorage:', storedData);
    
    if (!storedData) {
      console.log('No datasets found in localStorage, returning empty array');
      return [];
    }
    
    const savedConfigs = JSON.parse(storedData);
    
    if (!Array.isArray(savedConfigs)) {
      console.warn('Stored dataset data is not an array, resetting to empty array');
      localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify([]));
      return [];
    }
    
    return savedConfigs;
  } catch (error) {
    console.error('Error getting saved dataset configs:', error);
    // Reset localStorage if corrupted
    localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify([]));
    return [];
  }
};

/**
 * Get a dataset configuration by ID
 * @param {string} id - Dataset ID
 * @returns {Object|null} Dataset configuration or null if not found
 */
export const getDatasetConfigById = (id) => {
  const configs = getSavedDatasetConfigs();
  return configs.find(config => config.id === id);
};

/**
 * Delete a dataset configuration
 * @param {string} id - Dataset ID to delete
 * @returns {boolean} Success indicator
 */
export const deleteDatasetConfig = (datasetId) => {
  try {
    let configs = getSavedDatasetConfigs();
    configs = configs.filter(config => config.id !== datasetId);
    localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify(configs));
    return true;
  } catch (error) {
    console.error('Error deleting dataset config:', error);
    throw error;
  }
};

/**
 * Check if a dataset exists by ID
 * @param {string} id - Dataset ID
 * @returns {boolean} Whether the dataset exists
 */
export const datasetExists = (id) => {
  const dataset = getDatasetConfigById(id);
  return dataset !== null;
};

/**
 * Save a file reference to a dataset
 * This could be extended to handle actual file uploads in a production environment
 * @param {string} datasetId - Dataset ID
 * @param {Object} fileInfo - File information
 * @returns {Object} Updated dataset configuration
 */
export const saveDatasetFile = (datasetId, fileInfo) => {
  try {
    const dataset = getDatasetConfigById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }
    
    const updatedDataset = {
      ...dataset,
      file: fileInfo,
      lastModified: new Date().toISOString()
    };
    
    return saveDatasetConfig(updatedDataset);
  } catch (error) {
    console.error('Error saving dataset file:', error);
    throw error;
  }
};

/**
 * Update an existing dataset configuration
 * @param {string} datasetId - Dataset ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated configuration with metadata
 */
export const updateDatasetConfig = (datasetId, updates) => {
  try {
    console.log(`Updating dataset ${datasetId} with:`, updates);
    
    const savedConfigs = getSavedDatasetConfigs();
    const configIndex = savedConfigs.findIndex(config => config.id === datasetId);
    
    if (configIndex === -1) {
      console.error(`Dataset with ID ${datasetId} not found`);
      throw new Error(`Dataset with ID ${datasetId} not found`);
    }
    
    // Get existing config
    const existingConfig = savedConfigs[configIndex];
    
    // Create updated config
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    console.log('Updated config:', updatedConfig);
    
    // Replace in array
    savedConfigs[configIndex] = updatedConfig;
    
    // Save back to localStorage
    localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify(savedConfigs));
    console.log('Saved to localStorage. Total datasets:', savedConfigs.length);
    
    return updatedConfig;
  } catch (error) {
    console.error('Error updating dataset config:', error);
    throw error;
  }
};

/**
 * Search datasets by name or description
 * @param {string} query - Search query
 * @returns {Array} Array of matching dataset configurations
 */
export const searchDatasets = (query) => {
  if (!query) return getSavedDatasetConfigs();
  
  const configs = getSavedDatasetConfigs();
  const lowerQuery = query.toLowerCase();
  
  return configs.filter(config => 
    (config.name && config.name.toLowerCase().includes(lowerQuery)) || 
    (config.description && config.description.toLowerCase().includes(lowerQuery)) ||
    (config.dataset_id && config.dataset_id.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get datasets by source
 * @param {string} source - Dataset source
 * @returns {Array} Array of matching dataset configurations
 */
export const getDatasetsBySource = (source) => {
  if (!source) return getSavedDatasetConfigs();
  
  const configs = getSavedDatasetConfigs();
  return configs.filter(config => config.source === source);
};

/**
 * Export dataset configurations
 * @returns {string} JSON string of dataset configurations
 */
export const exportDatasetConfigs = () => {
  const configs = getSavedDatasetConfigs();
  return JSON.stringify(configs, null, 2);
};

/**
 * Import dataset configurations
 * @param {string} jsonString - JSON string of dataset configurations
 * @returns {Array} Array of imported dataset configurations
 */
export const importDatasetConfigs = (jsonString) => {
  try {
    const configs = JSON.parse(jsonString);
    
    if (!Array.isArray(configs)) {
      throw new Error('Invalid dataset configurations format');
    }
    
    localStorage.setItem(SAVED_DATASETS_KEY, JSON.stringify(configs));
    return getSavedDatasetConfigs();
  } catch (error) {
    console.error('Error importing dataset configurations:', error);
    throw error;
  }
}; 