/**
 * HuggingFace Service
 * Provides API methods for working with Hugging Face models
 */

import api from './api';

const API_BASE_URL = 'https://api-inference.huggingface.co/models';

/**
 * Generate text using a Hugging Face model
 * @param {string} model - The model ID
 * @param {string} prompt - The input prompt
 * @param {Object} [params={}] - Additional parameters for the model
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Generated text response
 */
export const generateText = async (model, prompt, params = {}, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/${model}`;
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Default parameters
    const defaultParams = {
      max_length: 100,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.0,
      do_sample: true
    };
    
    // Merge default and provided parameters
    const mergedParams = { ...defaultParams, ...params };
    
    // Create payload
    const payload = {
      inputs: prompt,
      parameters: mergedParams
    };
    
    // Make API request
    const response = await api.request(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if a Hugging Face model is available
 * @param {string} model - The model ID
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<boolean>} - Whether the model is available
 */
export const checkModelAvailability = async (model, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/${model}`;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make a small test query
    const payload = {
      inputs: "Hello",
      parameters: {
        max_length: 5,
        return_full_text: false
      },
      options: {
        wait_for_model: false
      }
    };
    
    // Make API request
    const response = await api.request(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    // If we get here, the model is available or loading
    return !response.error;
  } catch (error) {
    // If error contains "loading" or "currently loading", the model is still loading but available
    if (error.message && (error.message.includes('loading') || error.message.includes('currently loading'))) {
      return true;
    }
    // Otherwise, the model is not available
    return false;
  }
};

/**
 * Get information about a Hugging Face model
 * @param {string} model - The model ID
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Model information
 */
export const getModelInfo = async (model, apiKey = null) => {
  try {
    const url = `https://huggingface.co/api/models/${model}`;
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Search for models on Hugging Face
 * @param {string} query - Search query
 * @param {Object} [params={}] - Search parameters
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Search results
 */
export const searchModels = async (query, params = {}, apiKey = null) => {
  try {
    let url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}`;
    
    // Add params to URL
    if (params.filter) {
      url += `&filter=${encodeURIComponent(params.filter)}`;
    }
    if (params.limit) {
      url += `&limit=${params.limit}`;
    }
    if (params.sort) {
      url += `&sort=${encodeURIComponent(params.sort)}`;
    }
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available datasets from Hugging Face
 * @param {string} [query=''] - Search query
 * @param {Object} [params={}] - Search parameters
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Dataset search results
 */
export const searchDatasets = async (query = '', params = {}, apiKey = null) => {
  try {
    let url = `https://huggingface.co/api/datasets`;
    
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    
    // Add params to URL
    if (params.filter) {
      url += query ? `&filter=${encodeURIComponent(params.filter)}` : `?filter=${encodeURIComponent(params.filter)}`;
    }
    if (params.limit) {
      url += url.includes('?') ? `&limit=${params.limit}` : `?limit=${params.limit}`;
    }
    if (params.sort) {
      url += url.includes('?') ? `&sort=${encodeURIComponent(params.sort)}` : `?sort=${encodeURIComponent(params.sort)}`;
    }
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get dataset information from Hugging Face
 * @param {string} dataset - The dataset ID
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Dataset information
 */
export const getDatasetInfo = async (dataset, apiKey = null) => {
  try {
    const url = `https://huggingface.co/api/datasets/${dataset}`;
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get samples from a Hugging Face dataset
 * @param {string} dataset - The dataset ID
 * @param {string} [split='train'] - The dataset split
 * @param {number} [limit=10] - Maximum number of samples
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Array>} - Dataset samples
 */
export const getDatasetSample = async (dataset, split = 'train', limit = 10, apiKey = null) => {
  try {
    // First get info about the dataset to understand its structure
    const datasetInfo = await getDatasetInfo(dataset, apiKey);
    
    // Now get actual samples
    const url = `https://huggingface.co/api/datasets/${dataset}/data?split=${split}&limit=${limit}`;
    
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response;
  } catch (error) {
    throw error;
  }
}; 