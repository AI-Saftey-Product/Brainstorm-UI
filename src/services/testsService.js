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
    console.log('Fetching all tests');
    const response = await fetch(`${API_BASE_URL}/api/tests`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from tests API:', errorText);
      throw new Error(`Failed to fetch tests: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received all tests data:', data);
    
    // Transform the response if needed
    if (data && data.tests) {
      // Convert the tests object to an array
      const testsArray = Object.values(data.tests);
      console.log('Transformed all tests to array:', testsArray);
      return testsArray;
    } else if (Array.isArray(data)) {
      // Already in array format
      return data;
    } else {
      console.error('Invalid data format from getAllTests API:', data);
      return [];
    }
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
    // Ensure we have at least one required parameter
    if (!modelConfig.modality && !modelConfig.model_type) {
      console.warn('No model parameters provided for filtering tests. Using defaults.');
      // Default to NLP and Text Generation if nothing provided
      modelConfig = {
        modality: 'NLP',
        model_type: 'Text Generation',
        ...modelConfig
      };
    }
    
    // Build the query parameters based on model properties
    const params = new URLSearchParams();
    if (modelConfig.modality) {
      params.append('modality', modelConfig.modality);
    }
    if (modelConfig.model_type) {
      params.append('model_type', modelConfig.model_type);
    }

    const url = `${API_BASE_URL}/api/tests/model-tests?${params.toString()}`;
    console.log('Fetching filtered tests from:', url);
    
    // Use the correct API endpoint for model-specific tests
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from tests API:', errorText);
      throw new Error(`Failed to fetch filtered tests: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    console.log('Received filtered tests data:', data);
    
    // Transform the response to the expected format
    // The API returns { tests: { test_id: test_object, ... }, count, model_info }
    // But our components expect an array of test objects
    if (data && data.tests) {
      // Convert the tests object to an array
      const testsArray = Object.values(data.tests);
      console.log('Transformed tests to array:', testsArray);
      return testsArray;
    } else if (Array.isArray(data)) {
      // Already in array format
      return data;
    } else {
      console.error('Invalid data format from API:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching filtered tests:', error);
    // If we get a 422 error, try to return a default set of tests
    if (error.message && error.message.includes('422')) {
      console.warn('API returned 422, falling back to default tests');
      return getMockTestsForModality(modelConfig.modality);
    }
    throw error;
  }
};

// Helper function to generate mock tests when API fails
function getMockTestsForModality(modality = 'NLP') {
  const mockTests = [
    {
      id: 'prompt_injection_test',
      name: 'Prompt Injection Test',
      description: 'Tests if the model is vulnerable to prompt injection attacks',
      category: 'Security',
      severity: 'High',
      modality: 'NLP'
    },
    {
      id: 'bias_detection_test',
      name: 'Bias Detection Test',
      description: 'Detects bias in model responses to diverse prompts',
      category: 'Ethics',
      severity: 'Medium',
      modality: 'NLP'
    },
    {
      id: 'factuality_test',
      name: 'Factuality Test',
      description: 'Verifies if the model provides factually accurate information',
      category: 'Quality',
      severity: 'Medium',
      modality: 'NLP'
    }
  ];
  
  // Filter by modality if specified
  if (modality) {
    return mockTests.filter(test => test.modality === modality || test.modality === 'Any');
  }
  
  return mockTests;
}

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
    console.log('Fetching test categories');
    
    // Two approaches:
    // 1. Use dedicated categories endpoint if available
    // 2. Derive categories from test data if categories endpoint fails
    
    try {
      // First try the dedicated categories endpoint
      const response = await fetch(`${API_BASE_URL}/api/tests/categories`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received categories from API:', data);
        return data;
      } else {
        console.log('Categories endpoint not available, deriving from tests');
        throw new Error('Categories endpoint returned error');
      }
    } catch (categoriesError) {
      // If categories endpoint fails, fall back to deriving from tests
      console.log('Falling back to deriving categories from tests');
      
      // Get all tests
      const allTests = await getAllTests();
      
      if (Array.isArray(allTests)) {
        // Extract unique categories
        const categories = [...new Set(allTests.map(test => test.category))];
        console.log('Derived categories from tests:', categories);
        return categories;
      } else if (allTests && allTests.tests) {
        // Handle case where tests are returned as an object
        const testObjects = Object.values(allTests.tests);
        const categories = [...new Set(testObjects.map(test => test.category))];
        console.log('Derived categories from tests object:', categories);
        return categories;
      }
      
      throw new Error('Could not derive categories from tests');
    }
  } catch (error) {
    console.error('Error fetching test categories:', error);
    // If API fails, return default categories
    console.warn('Falling back to default test categories');
    return ['security', 'bias', 'toxicity', 'hallucination', 'robustness'];
  }
};

/**
 * Get available model modalities
 * @param {Object} options - Optional parameters for filtering modalities
 * @returns {Promise<Array>} List of available modalities
 */
export const getModelModalities = async (options = {}) => {
  try {
    // Create query parameters if options are provided
    const params = new URLSearchParams();
    
    // Add default or provided parameters
    if (options.model_type) {
      params.append('model_type', options.model_type);
    }
    
    // Build the URL with parameters
    const url = `${API_BASE_URL}/api/models/modalities${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('Requesting modalities from:', url);
    
    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`Failed to fetch model modalities: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received modalities data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching model modalities:', error);
    // If we get a 422 error, try to return a default set of modalities
    if (error.message && error.message.includes('422')) {
      console.log('Returning default modalities due to 422 error');
      return ['NLP', 'Vision', 'Audio', 'Multimodal'];
    }
    throw error;
  }
};