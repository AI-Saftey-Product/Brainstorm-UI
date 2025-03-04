/**
 * Tests Service
 * Handles test operations and execution
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Get all available tests
 * @returns {Promise<Array>} All tests
 */
export const getAllTests = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests`);
    if (!response.ok) {
      throw new Error('Failed to fetch tests');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tests:', error);
    throw error;
  }
};

/**
 * Get tests by category
 * @param {string} category - Category to filter by
 * @returns {Promise<Array>} Filtered tests
 */
export const getTestsByCategory = async (category) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests`);
    if (!response.ok) {
      throw new Error('Failed to fetch tests');
    }
    const tests = await response.json();
    return tests.filter(test => test.category === category);
  } catch (error) {
    console.error('Error fetching tests by category:', error);
    throw error;
  }
};

/**
 * Get available tests filtered by model configuration
 * @param {Object} modelConfig - Model configuration object containing modality and type
 * @returns {Promise<Array>} List of available tests
 */
export const getFilteredTests = async (modelConfig) => {
  try {
    const params = new URLSearchParams();
    if (modelConfig.modality) {
      params.append('modality', modelConfig.modality);
    }
    if (modelConfig.model_type) {
      params.append('model_type', modelConfig.model_type);
    }

    const response = await fetch(`${API_BASE_URL}/api/tests?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch filtered tests');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching filtered tests:', error);
    throw error;
  }
};

/**
 * Run selected tests against the model
 * @param {Array} testIds - IDs of tests to run
 * @param {Object} modelConfig - Model configuration
 * @param {Object} testParameters - Optional parameters for tests
 * @returns {Promise<Object>} Test results and compliance scores
 */
export const runTests = async (testIds, modelConfig, testParameters = {}) => {
  try {
    // Log model configuration for debugging
    console.log('Starting tests with model configuration:', modelConfig);
    console.log('Selected model ID:', modelConfig?.selectedModel || 'NOT SET');
    console.log('Model ID:', modelConfig?.modelId || 'NOT SET');
    
    // Ensure the model has a valid model ID before sending to API
    if (!modelConfig.selectedModel && modelConfig.modelId) {
      console.log('Setting missing selectedModel from modelId');
      modelConfig.selectedModel = modelConfig.modelId;
    }
    
    // Check for valid model ID
    if (!modelConfig.selectedModel || modelConfig.selectedModel === 'None' || modelConfig.selectedModel === 'undefined') {
      throw new Error('Missing or invalid model ID. Please ensure a valid model ID is specified in your model configuration.');
    }
    
    // Create a clean model settings object with only the essential properties
    // This prevents serialization issues with functions and ensures the backend gets what it expects
    const modelSettings = {
      model_id: modelConfig.selectedModel, // Use selectedModel as the primary ID
      model_type: modelConfig.modelType,
      model_name: modelConfig.modelName,
      model_category: modelConfig.modelCategory,
      source: modelConfig.source || 'huggingface',
      // Include API key if needed by backend
      api_key: modelConfig.apiKey
    };
    
    console.log('Sending cleaned model settings to API:', modelSettings);
    
    const response = await fetch(`${API_BASE_URL}/api/tests/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test_ids: testIds,
        model_settings: modelSettings,
        test_parameters: testParameters
      })
    });

    if (!response.ok) {
      // Get the error response text
      const errorText = await response.text();
      console.error(`Error response from tests/run API (${response.status}):`, errorText);
      throw new Error(`Failed to start test run: ${errorText}`);
    }
    
    const { task_id } = await response.json();
    return task_id;
  } catch (error) {
    console.error('Error running tests:', error);
    throw error;
  }
};

/**
 * Get status of a test run
 * @param {string} taskId - ID of the test run task
 * @returns {Promise<Object>} Task status information
 */
export const getTestStatus = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests/status/${taskId}`);
    
    if (!response.ok) {
      // Get the error response text
      const errorText = await response.text();
      console.error(`Error response from status API (${response.status}):`, errorText);
      throw new Error(`Failed to fetch test status: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching test status:', error);
    throw error;
  }
};

/**
 * Get results of a test run
 * @param {string} taskId - ID of the test run task
 * @returns {Promise<Object>} Test results and compliance scores
 */
export const getTestResults = async (taskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests/results/${taskId}`);
    
    if (!response.ok) {
      // Get the error response text
      const errorText = await response.text();
      console.error(`Error response from results API (${response.status}):`, errorText);
      throw new Error(`Failed to fetch test results: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching test results:', error);
    throw error;
  }
};

/**
 * Get all test categories
 * @returns {Promise<Array>} List of test categories
 */
export const getTestCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests/categories`);
    if (!response.ok) {
      throw new Error('Failed to fetch test categories');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching test categories:', error);
    throw error;
  }
};

/**
 * Get available model modalities
 * @returns {Promise<Array>} List of available modalities
 */
export const getModelModalities = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models/modalities`);
    if (!response.ok) {
      throw new Error('Failed to fetch model modalities');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching model modalities:', error);
    throw error;
  }
};