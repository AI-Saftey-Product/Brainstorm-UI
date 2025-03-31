/**
 * Tests Service
 * Handles test operations and execution
 */

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';

// Default fetch options for all API calls
const fetchOptions = {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Add a cache for test results
const testResultsCache = new Map();

// Add a count for consecutive identical results
let consecutiveIdenticalResults = 0;
const MAX_IDENTICAL_RESULTS = 2;

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
 * Run tests with the selected test IDs and model configuration
 * @param {Array} testIds - List of test IDs to run
 * @param {Object} modelConfig - Model configuration
 * @param {Object} testParameters - Additional test parameters
 * @param {Function} logCallback - Optional callback for log messages
 * @returns {Promise<string>} - Task ID for the test run
 */
export const runTests = async (testIds, modelConfig, testParameters = {}, logCallback = null) => {
  try {
    if (!testIds || testIds.length === 0) {
      throw new Error('No tests selected');
    }

    if (!modelConfig) {
      throw new Error('No model configuration provided');
    }

    const log = (message) => {
      console.log(message);
      if (logCallback && typeof logCallback === 'function') {
        logCallback(message);
      }
    };

    log('Preparing to run tests...');
    log(`Selected tests: ${testIds.length}`);
    log(`Model: ${modelConfig.name || modelConfig.modelName}`);

    // Format payload to match API expectations
    const payload = {
      // Use test_ids instead of tests
      test_ids: testIds,
      
      // Use model_settings instead of model
      model_settings: {
        // Only include fields expected by the API
        model_id: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
        modality: modelConfig.modality || modelConfig.modelCategory || 'NLP',
        sub_type: modelConfig.sub_type || modelConfig.modelType || '',
        source: modelConfig.source || 'huggingface',
        api_key: modelConfig.api_key || modelConfig.apiKey || ''
        // name field is not used in the API
      },
      
      // Use parameters for test-specific parameters
      parameters: { ...testParameters }
    };

    // Add test_run_id if provided to the root of the payload
    if (testParameters && testParameters.test_run_id) {
      log(`Using provided test run ID: ${testParameters.test_run_id}`);
      payload.test_run_id = testParameters.test_run_id;
      // Remove from parameters to avoid duplication
      delete payload.parameters.test_run_id;
    }

    log('Sending request to API...');
    console.log('Request payload:', payload);

    const response = await fetch(`${API_BASE_URL}/api/tests/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    log('API response received');
    console.log('Response:', data);

    if (data && (data.task_id || data.test_run_id)) {
      const taskId = data.task_id || data.test_run_id;
      log(`Tests initiated with task ID: ${taskId}`);
      return taskId;
    } else {
      throw new Error('No task ID in response');
    }
  } catch (error) {
    console.error('Error running tests:', error);
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
    console.log('Using API base URL:', API_BASE_URL);
    
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
    console.log('Using fetch options:', fetchOptions);
    
    // Use the correct API endpoint for model-specific tests
    const response = await fetch(url, fetchOptions);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status} response from API:`, errorText);
      console.error('Request URL:', url);
      console.error('Request options:', fetchOptions);
      
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
      console.log('Data is already in array format, count:', data.length);
      return data;
    } else {
      console.error('Unexpected data format from API:', data);
      return [];
    }
  } catch (error) {
    console.error('Error in getFilteredTests:', error);
    console.error('Model config that caused error:', modelConfig);
    console.error('API base URL:', API_BASE_URL);
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

/**
 * Get results of a test run
 * @param {string} taskId - ID of the test run task
 * @returns {Promise<Object>} Test results and compliance scores
 */
export const getTestResults = async (taskId) => {
  if (!taskId) {
    console.error('[TESTS-SERVICE] No task ID provided to getTestResults');
    throw new Error('Task ID is required');
  }
  
  console.log(`[TESTS-SERVICE] API endpoints not available, loading from localStorage: ${taskId}`);
  
  try {
    // Try to load results from localStorage instead
    const storedResults = localStorage.getItem('testResults');
    const storedScores = localStorage.getItem('complianceScores');
    
    if (!storedResults) {
      console.warn('[TESTS-SERVICE] No results found in localStorage');
      return null;
    }
    
    const results = JSON.parse(storedResults);
    const scores = storedScores ? JSON.parse(storedScores) : {};
    
    console.log(`[TESTS-SERVICE] Loaded ${Object.keys(results).length} results from localStorage`);
    
    // Return in a format similar to expected API response
    return {
      test_run: {
        id: taskId,
        results: results,
        compliance_scores: scores
      }
    };
  } catch (error) {
    console.error('[TESTS-SERVICE] Error loading results from localStorage:', error);
    throw new Error('Failed to load test results');
  }
};