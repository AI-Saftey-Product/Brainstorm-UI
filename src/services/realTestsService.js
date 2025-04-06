/**
 * Real Tests Service
 * Handles interaction with real-world test APIs
 */

import api from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get all available real tests from the API
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Array of test objects
 */
export const getRealTests = async (params = {}) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    
    if (params.category) {
      queryParams.append('category', params.category);
    }
    
    if (params.modality) {
      queryParams.append('modality', params.modality);
    }
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/real-tests${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get test details by ID
 * @param {string} testId - The test ID
 * @returns {Promise<Object>} Test details
 */
export const getRealTestById = async (testId) => {
  try {
    const url = `${API_BASE_URL}/real-tests/${testId}`;
    
    const response = await api.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Run real-world tests on a model
 * @param {Object} params - Test parameters
 * @param {string} params.modelId - The model ID to test
 * @param {Array} params.testIds - Array of test IDs to run
 * @param {string} params.apiKey - API key for the model
 * @returns {Promise<Object>} Test results
 */
export const runRealTests = async (params) => {
  try {
    const { modelId, testIds, apiKey } = params;
    
    if (!modelId) {
      throw new Error('Model ID is required');
    }
    
    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      throw new Error('At least one test ID is required');
    }
    
    const url = `${API_BASE_URL}/real-tests/run`;
    
    const response = await api.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: modelId,
        test_ids: testIds,
        api_key: apiKey
      })
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available test categories
 * @returns {Promise<Array>} Array of category objects
 */
export const getRealTestCategories = async () => {
  try {
    const url = `${API_BASE_URL}/real-tests/categories`;
    
    const response = await api.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  getRealTests,
  getRealTestById,
  runRealTests,
  getRealTestCategories
}; 