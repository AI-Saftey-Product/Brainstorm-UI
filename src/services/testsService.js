/**
 * Tests Service
 * Handles test operations and execution
 */

const API_BASE_URL = 'https://51.20.87.231:8000';

// Default fetch options for all API calls
const fetchOptions = {
  mode: 'cors',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Get all available tests
 * @returns {Promise<Object>} Object containing tests, count, and model_info
 */
export const getAllTests = async () => {
  try {
    console.log('Fetching all tests from backend');
    const response = await fetch(`${API_BASE_URL}/api/tests/model-tests`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from API:', errorText);
      throw new Error(`Failed to fetch tests: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received tests data from backend:', data);
    return data;
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
    console.log(`Fetching tests for category "${category}" from backend`);
    
    // Use model-tests endpoint with category filter
    const params = new URLSearchParams();
    params.append('category', category);
    
    const response = await fetch(`${API_BASE_URL}/api/tests/model-tests?${params.toString()}`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from API:', errorText);
      throw new Error(`Failed to fetch tests by category: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Received tests for category "${category}" from backend:`, data);
    
    // Return the tests as an array
    if (data && data.tests) {
      return Object.values(data.tests);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching tests for category "${category}":`, error);
    return [];
  }
};

/**
 * Format model type to be lowercase with underscores
 * @param {string} modelType - The model type to format
 * @returns {string} Formatted model type
 */
const formatModelType = (modelType) => {
  if (!modelType) return '';
  return modelType.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Run selected tests on the configured model
 * @param {Array} testIds - Array of test IDs to run
 * @param {Object} modelConfig - Model configuration object
 * @param {Object} testParameters - Optional parameters for tests
 * @param {Function} logCallback - Optional callback for logging
 * @returns {Promise<string>} Task ID for the test run
 */
export const runTests = async (testIds, modelConfig, testParameters = {}, logCallback = null) => {
  try {
    // Log model configuration for debugging
    console.log('Starting tests with model configuration:', modelConfig);
    
    // Check for valid model configuration
    if (!modelConfig || !modelConfig.model_id) {
      throw new Error('Missing or invalid model configuration. Please ensure a valid model is configured.');
    }
    
    // Create a clean model settings object for the API
    // Ensure we're using the field names the API expects
    const modelSettings = {
      name: modelConfig.name || modelConfig.modelName || 'Unnamed Model',
      modality: modelConfig.modality || modelConfig.modelCategory || 'NLP',
      sub_type: formatModelType(modelConfig.sub_type || modelConfig.modelType || ''),
      source: modelConfig.source || 'huggingface',
      model_id: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
      api_key: modelConfig.api_key || modelConfig.apiKey || ''
    };
    
    console.log('Sending model settings to API:', modelSettings);
    
    // Create the complete request body
    const requestBody = {
      test_ids: testIds,
      model_settings: modelSettings,
      parameters: testParameters
    };
    
    // Log the complete request body
    console.log('Complete request body being sent to API:', JSON.stringify(requestBody, null, 2));
    
    // Make the API request to run tests
    const response = await fetch(`${API_BASE_URL}/api/tests/run`, {
      method: 'POST',
      ...fetchOptions,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from API:', errorText);
      console.error('Request that caused the error:', JSON.stringify(requestBody, null, 2));
      throw new Error(`Failed to run tests: ${response.status} ${response.statusText}`);
    }
    
    if (logCallback) logCallback(`Test run initiated successfully`);
    
    const { task_id } = await response.json();
    if (logCallback) logCallback(`Test run started with task ID: ${task_id}`);
    console.log('Test run started with task ID:', task_id);
    
    if (!task_id) {
      throw new Error('No task ID returned from the API. The test run may have failed.');
    }
    
    return task_id;
  } catch (error) {
    console.error('Error running tests:', error);
    if (logCallback) logCallback(`Error: ${error.message}`);
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
    console.log('getFilteredTests called with:', modelConfig);
    
    // Ensure we have at least one required parameter
    if (!modelConfig || (!modelConfig.modality && !modelConfig.model_type)) {
      console.warn('No model parameters provided for filtering tests. Using defaults.');
      // Default to NLP and Text Generation if nothing provided
      modelConfig = {
        modality: 'NLP',
        model_type: 'Text Generation',
        ...(modelConfig || {})
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
    console.log('Fetching filtered tests from backend URL:', url);
    
    // Use the correct API endpoint for model-specific tests
    const response = await fetch(url, fetchOptions);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status} response from API:`, errorText);
      
      if (response.status === 422) {
        console.error('Unprocessable Content Error. API parameters may be incorrect.', modelConfig);
        // Return empty array instead of throwing to prevent blocking the UI
        return [];
      }
      
      throw new Error(`Failed to fetch filtered tests: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received filtered tests data from backend:', data);
    
    // Transform the response to array format for the UI
    if (data && data.tests) {
      // Convert the tests object to an array
      const testsArray = Object.values(data.tests);
      console.log('Converted tests to array format, count:', testsArray.length);
      return testsArray;
    } else if (Array.isArray(data)) {
      // Already in array format
      return data;
    } else {
      console.error('Unexpected data format from API:', data);
      return [];
    }
  } catch (error) {
    console.error('Error in getFilteredTests:', error);
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
    console.log('Fetching results for task from backend:', taskId);
    
    // Validate the taskId before making API call
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      console.error('Invalid task ID provided:', taskId);
      throw new Error('Invalid task ID provided to getTestResults');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tests/results/${taskId}`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from results API (${response.status}):`, errorText);
      throw new Error(`Failed to fetch test results: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received test results from backend:', data);
    return data;
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
    console.log('Fetching test categories from backend');
    const response = await fetch(`${API_BASE_URL}/api/tests/categories`, fetchOptions);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Received categories from backend:', data);
      return data;
    } else {
      console.log('Categories endpoint not available, deriving from tests');
      
      // If categories endpoint fails, fall back to deriving from tests
      const allTestsData = await getAllTests();
      
      if (allTestsData && allTestsData.tests) {
        // Extract unique categories from tests
        const testsArray = Object.values(allTestsData.tests);
        const categories = [...new Set(testsArray.map(test => test.category))];
        console.log('Derived categories from tests:', categories);
        return categories;
      } else if (Array.isArray(allTestsData)) {
        // Handle case where tests are returned as an array
        const categories = [...new Set(allTestsData.map(test => test.category))];
        console.log('Derived categories from tests array:', categories);
        return categories;
      }
      
      throw new Error('Could not derive categories from tests');
    }
  } catch (error) {
    console.error('Error fetching test categories:', error);
    throw error;
  }
};