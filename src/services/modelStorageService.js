// Service for managing saved model configurations and test results
const SAVED_MODELS_KEY = 'savedModelConfigs';
const TEST_RESULTS_KEY = 'modelTestResults';

// Save a new model configuration
export const saveModelConfig = (config) => {
  try {
    const savedConfigs = getSavedModelConfigs();
    const timestamp = new Date().toISOString();
    
    // Ensure selectedModel is set if missing but modelId exists
    if (!config.selectedModel && config.modelId) {
      config.selectedModel = config.modelId;
    }
    
    const configWithMeta = {
      ...config,
      id: `model_${timestamp}`,
      createdAt: timestamp,
      lastModified: timestamp
    };
    
    savedConfigs.push(configWithMeta);
    localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(savedConfigs));
    return configWithMeta;
  } catch (error) {
    console.error('Error saving model config:', error);
    throw error;
  }
};

// Get all saved model configurations
export const getSavedModelConfigs = () => {
  try {
    const savedConfigs = localStorage.getItem(SAVED_MODELS_KEY);
    return savedConfigs ? JSON.parse(savedConfigs) : [];
  } catch (error) {
    console.error('Error getting saved configs:', error);
    return [];
  }
};

// Get a specific model configuration by ID
export const getModelConfigById = (id) => {
  const configs = getSavedModelConfigs();
  return configs.find(config => config.id === id);
};

// Save test results for a specific model
export const saveTestResults = (modelId, results) => {
  try {
    const allResults = getTestResults();
    const timestamp = new Date().toISOString();
    const resultsWithMeta = {
      modelId,
      results,
      timestamp,
      id: `test_${timestamp}`
    };
    
    allResults.push(resultsWithMeta);
    localStorage.setItem(TEST_RESULTS_KEY, JSON.stringify(allResults));
    return resultsWithMeta;
  } catch (error) {
    console.error('Error saving test results:', error);
    throw error;
  }
};

// Get all test results
export const getTestResults = () => {
  try {
    const results = localStorage.getItem(TEST_RESULTS_KEY);
    return results ? JSON.parse(results) : [];
  } catch (error) {
    console.error('Error getting test results:', error);
    return [];
  }
};

// Get test results for a specific model
export const getModelTestResults = (modelId) => {
  const allResults = getTestResults();
  return allResults.filter(result => result.modelId === modelId);
};

// Delete a model configuration and its associated test results
export const deleteModelConfig = (modelId) => {
  try {
    let configs = getSavedModelConfigs();
    configs = configs.filter(config => config.id !== modelId);
    localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(configs));
    
    let results = getTestResults();
    results = results.filter(result => result.modelId !== modelId);
    localStorage.setItem(TEST_RESULTS_KEY, JSON.stringify(results));
    
    return true;
  } catch (error) {
    console.error('Error deleting model config:', error);
    throw error;
  }
};

// Update a model configuration
export const updateModelConfig = (modelId, updates) => {
  try {
    const configs = getSavedModelConfigs();
    const index = configs.findIndex(config => config.id === modelId);
    
    if (index === -1) {
      throw new Error('Model configuration not found');
    }
    
    // Ensure selectedModel is set if missing but modelId exists in updates
    if (updates.modelId && !updates.selectedModel) {
      updates.selectedModel = updates.modelId;
    }
    
    configs[index] = {
      ...configs[index],
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(configs));
    return configs[index];
  } catch (error) {
    console.error('Error updating model config:', error);
    throw error;
  }
}; 