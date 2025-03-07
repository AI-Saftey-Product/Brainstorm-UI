// Service for managing saved model configurations and test results
const SAVED_MODELS_KEY = 'savedModelConfigs';
const TEST_RESULTS_KEY = 'modelTestResults';

// Save a new model configuration
export const saveModelConfig = (config) => {
  try {
    const savedConfigs = getSavedModelConfigs();
    const timestamp = new Date().toISOString();
    
    // Map new field names to old field names for backward compatibility
    const configWithMeta = {
      ...config,
      // Add backward compatibility fields
      modelName: config.name || config.modelName || 'Unnamed Model',
      modelType: config.sub_type || config.modelType || '',
      modelCategory: config.modality || config.modelCategory || '',
      modelId: config.model_id || config.modelId || '',
      selectedModel: config.model_id || config.modelId || config.selectedModel || '',
      apiKey: config.api_key || config.apiKey || '',
      // Add new fields if they don't exist
      name: config.name || config.modelName || 'Unnamed Model',
      modality: config.modality || config.modelCategory || 'NLP',
      sub_type: config.sub_type || config.modelType || '',
      source: config.source || 'huggingface',
      model_id: config.model_id || config.modelId || config.selectedModel || '',
      api_key: config.api_key || config.apiKey || '',
      // Add metadata
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
    
    // Map new field names to old field names for backward compatibility
    const updatedConfig = {
      ...configs[index],
      ...updates,
      // Update backward compatibility fields
      modelName: updates.name || updates.modelName || configs[index].modelName || configs[index].name || 'Unnamed Model',
      modelType: updates.sub_type || updates.modelType || configs[index].modelType || configs[index].sub_type || '',
      modelCategory: updates.modality || updates.modelCategory || configs[index].modelCategory || configs[index].modality || '',
      modelId: updates.model_id || updates.modelId || configs[index].modelId || configs[index].model_id || '',
      selectedModel: updates.model_id || updates.modelId || updates.selectedModel || configs[index].selectedModel || configs[index].model_id || '',
      apiKey: updates.api_key || updates.apiKey || configs[index].apiKey || configs[index].api_key || '',
      // Update new fields
      name: updates.name || updates.modelName || configs[index].name || configs[index].modelName || 'Unnamed Model',
      modality: updates.modality || updates.modelCategory || configs[index].modality || configs[index].modelCategory || 'NLP',
      sub_type: updates.sub_type || updates.modelType || configs[index].sub_type || configs[index].modelType || '',
      source: updates.source || configs[index].source || 'huggingface',
      model_id: updates.model_id || updates.modelId || updates.selectedModel || configs[index].model_id || configs[index].modelId || configs[index].selectedModel || '',
      api_key: updates.api_key || updates.apiKey || configs[index].api_key || configs[index].apiKey || '',
      // Update metadata
      lastModified: new Date().toISOString()
    };
    
    configs[index] = updatedConfig;
    localStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(configs));
    return updatedConfig;
  } catch (error) {
    console.error('Error updating model config:', error);
    throw error;
  }
}; 