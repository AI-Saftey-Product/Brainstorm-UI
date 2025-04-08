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
    const response = await fetch(`${API_BASE_URL}/api/tests/model-tests`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tests: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
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
    // Use model-tests endpoint with category filter
    const params = new URLSearchParams();
    params.append('category', category);
    
    const response = await fetch(`${API_BASE_URL}/api/tests/model-tests?${params.toString()}`, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tests by category: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Return the tests as an array
    if (data && data.tests) {
      return Object.values(data.tests);
    }
    
    return [];
  } catch (error) {
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

    console.log('🚀 TEST SERVICE: Running tests with:', {
      testIds,
      modelConfig: {...modelConfig, api_key: '***REDACTED***'},
      testParameters
    });

    const log = (message) => {
      if (logCallback && typeof logCallback === 'function') {
        logCallback(message);
      }
      console.log(`📝 TEST SERVICE LOG: ${message}`);
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

    // Add OpenAI specific parameters if the source is OpenAI
    if (modelConfig.source === 'openai') {
      payload.model_settings.temperature = Number(modelConfig.temperature || 0.7);
      payload.model_settings.max_tokens = Number(modelConfig.max_tokens || 1024);
      payload.model_settings.frequency_penalty = Number(modelConfig.frequency_penalty || 0);
      payload.model_settings.presence_penalty = Number(modelConfig.presence_penalty || 0);
      
      if (modelConfig.organization_id) {
        payload.model_settings.organization_id = modelConfig.organization_id;
      }
    }

    // Add test_run_id if provided to the root of the payload
    if (testParameters && testParameters.test_run_id) {
      log(`Using provided test run ID: ${testParameters.test_run_id}`);
      payload.test_run_id = testParameters.test_run_id;
      // Remove from parameters to avoid duplication
      delete payload.parameters.test_run_id;
    }

    log('Sending request to API...');
    console.log('📤 TEST SERVICE: API Request payload:', JSON.stringify(payload, (key, value) => 
      key === 'api_key' ? '***REDACTED***' : value
    ));

    const response = await fetch(`${API_BASE_URL}/api/tests/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ TEST SERVICE: API request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    log('API response received');
    console.log('📥 TEST SERVICE: API Response data:', data);

    if (data && (data.task_id || data.test_run_id)) {
      const taskId = data.task_id || data.test_run_id;
      log(`Tests initiated with task ID: ${taskId}`);
      console.log('✅ TEST SERVICE: Got task ID:', taskId);
      return taskId;
    } else {
      console.error('❌ TEST SERVICE: No task ID in response:', data);
      throw new Error('No task ID in response');
    }
  } catch (error) {
    console.error('❌ TEST SERVICE: Error running tests:', error);
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
    if (!modelConfig || (!modelConfig.modality && !modelConfig.model_type)) {
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
    
    // Use the correct API endpoint for model-specific tests
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 422) {
        // Return empty array instead of throwing to prevent blocking the UI
        return [];
      }
      
      throw new Error(`Failed to fetch filtered tests: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform the response to array format for the UI
    if (data && data.tests) {
      // Convert the tests object to an array
      const testsArray = Object.values(data.tests);
      return testsArray;
    } else if (Array.isArray(data)) {
      // Already in array format
      return data;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Get all test categories
 * @returns {Promise<Array>} List of test categories
 */
export const getTestCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tests/categories`, fetchOptions);
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      // If categories endpoint fails, fall back to deriving from tests
      const allTestsData = await getAllTests();
      
      if (allTestsData && allTestsData.tests) {
        // Extract unique categories from tests
        const testsArray = Object.values(allTestsData.tests);
        const categories = [...new Set(testsArray.map(test => test.category))];
        return categories;
      } else if (Array.isArray(allTestsData)) {
        // Handle case where tests are returned as an array
        const categories = [...new Set(allTestsData.map(test => test.category))];
        return categories;
      }
      
      throw new Error('Could not derive categories from tests');
    }
  } catch (error) {
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
    if (!taskId) {
      console.error('❌ TEST RESULTS: No task ID provided');
      throw new Error('Task ID is required');
    }
    
    console.log('🔍 TEST RESULTS: Fetching results for task:', taskId);
    
    // Check cache first
    if (testResultsCache.has(taskId)) {
      const cachedResults = testResultsCache.get(taskId);
      
      // Log cache hit
      console.log('🔍 TEST RESULTS: Cache hit for task:', taskId);
      
      return cachedResults;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tests/results/${taskId}`, fetchOptions);
    
    if (!response.ok) {
      // Try to get error details
      const errorText = await response.text();
      console.error('❌ TEST RESULTS: API request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Failed to fetch test results: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📥 TEST RESULTS: Received results:', data);
    
    // Cache the results
    testResultsCache.set(taskId, data);
    
    // Check for consecutive identical results and clear cache if needed
    if (testResultsCache.size > 10) {
      console.log('🧹 TEST RESULTS: Cache cleanup, removing oldest entries');
      // Get all entries and sort by timestamp
      const entries = Array.from(testResultsCache.entries());
      const oldestEntries = entries.slice(0, entries.length - 10);
      // Remove oldest entries
      oldestEntries.forEach(([key]) => testResultsCache.delete(key));
    }
    
    return data;
  } catch (error) {
    console.error('❌ TEST RESULTS: Error fetching results:', error);
    throw error;
  }
};

/**
 * Get available models of a specific modality
 * @param {string} modality - The modality to filter by (e.g., "NLP")
 * @returns {Promise<Array>} List of available models
 */
export const getAvailableModels = async (modality) => {
  try {
    const params = new URLSearchParams();
    if (modality) {
      params.append('modality', modality);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/models?${params.toString()}`, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    throw error;
  }
};