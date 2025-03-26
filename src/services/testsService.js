/**
 * Tests Service
 * Handles test operations and execution
 */

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
console.log('Using Tests API Base URL:', API_BASE_URL);

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

// Function to ensure URL has the correct format
const getApiUrl = (path) => {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
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

    const response = await fetch(getApiUrl('/api/tests/run'), {
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
  try {
    // If we already have results for this task, return them from cache
    if (testResultsCache.has(taskId)) {
      console.log('Returning test results from cache for task:', taskId);
      
      // Increment the count of consecutive identical results
      consecutiveIdenticalResults++;
      
      // If we've gotten the same results multiple times, force a completed status
      if (consecutiveIdenticalResults >= MAX_IDENTICAL_RESULTS) {
        console.log(`Received identical results ${consecutiveIdenticalResults} times, marking as definitely completed`);
        const cachedResults = testResultsCache.get(taskId);
        return {
          ...cachedResults,
          cached: true,
          status: 'completed',
          definitely_completed: true
        };
      }
      
      const cachedResults = testResultsCache.get(taskId);
      // Add a flag to indicate these are cached results
      return {
        ...cachedResults,
        cached: true,
        status: 'completed'
      };
    }
    
    console.log('Fetching results for task from backend:', taskId);
    
    // Reset consecutive identical results counter when making a new request
    consecutiveIdenticalResults = 0;
    
    // Validate the taskId before making API call
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      console.error('Invalid task ID provided:', taskId);
      throw new Error('Invalid task ID provided to getTestResults');
    }
    
    // Use API_BASE_URL from environment or fallback to default
    const API_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
    console.log('Using API URL:', API_URL);
    
    // Updated to use the correct endpoint URL pattern with PATH parameter (not query parameter)
    const resultsEndpoint = `${API_URL}/api/tests/results/${taskId}`;
    console.log('Fetching results from:', resultsEndpoint);
    
    const response = await fetch(getApiUrl(`/api/tests/results/${taskId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response from results API (${response.status}):`, errorText);
      throw new Error(`Failed to fetch test results: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received test results from backend:', data);
    
    // Special handling based on the response format
    let processedData = data;
    
    // Handle different response formats
    // Case 1: Array directly
    if (Array.isArray(data)) {
      console.log('Results returned as an array, wrapping in expected format');
      processedData = {
        results: data,
        status: 'completed'
      };
    } 
    // Case 2: Object with results.results nested structure
    else if (data.results && data.results.results) {
      console.log('Results have double nesting, flattening structure');
      processedData = {
        results: data.results.results,
        status: data.status || 'completed',
        summary: data.summary || data.results.summary || null,
        compliance_scores: data.compliance_scores || data.results.compliance_scores || null
      };
    }
    // Case 3: Results with nested structure
    else if (data.results && !Array.isArray(data.results)) {
      console.log('Results are an object with nested properties');
      processedData = {
        results: Array.isArray(data.results) ? data.results : Object.values(data.results),
        status: data.status || 'completed',
        summary: data.summary || null,
        compliance_scores: data.compliance_scores || null
      };
    }
    
    console.log('Processed data format:', processedData);
    
    // Ensure results is always an array
    if (processedData.results && !Array.isArray(processedData.results)) {
      processedData.results = Object.values(processedData.results);
    }
    
    // Check if the results are complete and should be cached
    if (processedData.results && processedData.results.length > 0) {
      console.log('Caching test results for task:', taskId);
      testResultsCache.set(taskId, processedData);
      
      // Add summary information if not present
      if (!processedData.summary) {
        const totalTests = processedData.results.length;
        const passedTests = processedData.results.filter(
          test => test.status === 'success' || test.status === 'passed'
        ).length;
        
        processedData.summary = {
          total_tests: totalTests,
          passed: passedTests,
          failed: totalTests - passedTests
        };
      }
    }
    
    return processedData;
  } catch (error) {
    console.error('Error fetching test results:', error);
    throw error;
  }
};