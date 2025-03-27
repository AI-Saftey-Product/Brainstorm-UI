/**
 * Tests Service
 * Handles test operations and execution
 */

const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'https://16.171.112.40';
console.log('Using Tests API Base URL:', API_BASE_URL);

// Default fetch options for browser
const defaultFetchOptions = {
  mode: 'cors',
  credentials: 'include', // Changed from 'omit' to 'include' to match backend's Access-Control-Allow-Credentials
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://aws-amplify.d1gdmj3u8tokdo.amplifyapp.com' // Add Origin header to match backend's allowed origin
  }
};

// Add a cache for test results
const testResultsCache = new Map();

// Add a count for consecutive identical results
let consecutiveIdenticalResults = 0;
const MAX_IDENTICAL_RESULTS = 2;

// Function to ensure URL has the correct format and protocol
const getApiUrl = (path) => {
  // Ensure we're using HTTPS in production
  const isProduction = import.meta.env.PROD;
  let baseUrl = API_BASE_URL;
  
  // Force HTTPS in production
  if (isProduction && baseUrl.startsWith('http:')) {
    baseUrl = baseUrl.replace('http:', 'https:');
  }
  
  // Clean up the URL
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  const fullUrl = `${baseUrl}${cleanPath}`;
  console.log('Generated API URL:', {
    baseUrl,
    path,
    fullUrl,
    isProduction
  });
  
  return fullUrl;
};

// Function to make API requests
const makeRequest = async (url, options = {}) => {
  const fetchOptions = {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...options.headers
    }
  };

  console.log('Making API request:', {
    url,
    method: options.method || 'GET',
    headers: fetchOptions.headers,
    credentials: fetchOptions.credentials
  });

  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn('Response was not JSON:', text);
        return text;
      }
    }
  } catch (error) {
    if (error.message.includes('ERR_CERT_AUTHORITY_INVALID')) {
      console.warn('Certificate validation failed. Please accept the certificate in your browser or contact the administrator to set up proper SSL certificates.');
    }
    console.error('Request failed:', {
      error: error.message,
      url: url,
      options: fetchOptions
    });
    throw error;
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
 * Get all available tests
 * @returns {Promise<Object>} Object containing tests, count, and model_info
 */
export const getAllTests = async () => {
  try {
    console.log('Fetching all tests from backend');
    return await makeRequest(`${API_BASE_URL}/api/tests/model-tests`);
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
    
    const params = new URLSearchParams();
    params.append('category', category);
    
    return await makeRequest(`${API_BASE_URL}/api/tests/model-tests?${params.toString()}`);
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

    const payload = {
      test_ids: testIds,
      model_settings: {
        model_id: modelConfig.model_id || modelConfig.modelId || modelConfig.selectedModel || '',
        modality: modelConfig.modality || modelConfig.modelCategory || 'NLP',
        sub_type: modelConfig.sub_type || modelConfig.modelType || '',
        source: modelConfig.source || 'huggingface',
        api_key: modelConfig.api_key || modelConfig.apiKey || ''
      },
      parameters: { ...testParameters }
    };

    if (testParameters && testParameters.test_run_id) {
      payload.test_run_id = testParameters.test_run_id;
      delete payload.parameters.test_run_id;
    }

    log('Sending request to API...');
    console.log('Request payload:', payload);

    const data = await makeRequest(getApiUrl('/api/tests/run'), {
      method: 'POST',
      body: JSON.stringify(payload)
    });

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
    
    if (!modelConfig || (!modelConfig.modality && !modelConfig.model_type)) {
      console.warn('No model parameters provided for filtering tests. Using defaults.');
      modelConfig = {
        modality: 'NLP',
        model_type: 'Text Generation',
        ...(modelConfig || {})
      };
    }
    
    const params = new URLSearchParams();
    if (modelConfig.modality) {
      params.append('modality', modelConfig.modality);
    }
    if (modelConfig.model_type) {
      params.append('model_type', modelConfig.model_type);
    }

    const url = `${API_BASE_URL}/api/tests/model-tests?${params.toString()}`;
    console.log('Fetching filtered tests from backend URL:', url);
    
    const data = await makeRequest(url);
    
    if (data && data.tests) {
      const testsArray = Object.values(data.tests);
      console.log('Converted tests to array format, count:', testsArray.length);
      return testsArray;
    } else if (Array.isArray(data)) {
      console.log('Data is already in array format, count:', data.length);
      return data;
    } else {
      console.error('Unexpected data format from API:', data);
      return [];
    }
  } catch (error) {
    console.error('Error in getFilteredTests:', error);
    console.error('Model config that caused error:', modelConfig);
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
    return await makeRequest(`${API_BASE_URL}/api/tests/categories`);
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
    const API_URL = import.meta.env.VITE_TESTS_API_URL || 'https://16.171.112.40';
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