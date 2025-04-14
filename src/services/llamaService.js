/**
 * Llama API Service
 * Provides functions to interact with Llama models
 */

import api from './api';

// Llama API endpoint - this should be configurable
const API_BASE_URL = 'http://localhost:8000/v1';

/**
 * Generate text using a Llama model
 * @param {string} model - The model ID
 * @param {string} prompt - The input prompt
 * @param {Object} [params={}] - Additional parameters for the model
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Generated text response
 */
export const generateText = async (model, prompt, params = {}, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/completions`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Default parameters aligned with Llama.cpp server
    const defaultParams = {
      max_tokens: 100,
      temperature: 0.7,
      top_p: 0.9,
      repeat_penalty: 1.1,
      top_k: 40,
      echo: false
    };
    
    // Merge default and provided parameters
    const mergedParams = { ...defaultParams, ...params };
    
    // Create payload
    const payload = {
      model: model,
      prompt: prompt,
      ...mergedParams
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
 * Check if a Llama model is available
 * @param {string} model - The model ID
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<boolean>} - Whether the model is available
 */
export const checkModelAvailability = async (model, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/models`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request to list models
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    // Check if the requested model is in the list
    const models = response.data || [];
    return models.some(m => m.id === model);
  } catch (error) {
    return false;
  }
};

/**
 * Get information about available Llama models
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Array>} - List of available models
 */
export const getAvailableModels = async (apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/models`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Make API request
    const response = await api.request(url, {
      method: 'GET',
      headers
    });
    
    return response.data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Chat with a Llama model
 * @param {string} model - The model ID
 * @param {Array} messages - Array of chat messages
 * @param {Object} [params={}] - Additional parameters for the model
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Chat response
 */
export const chat = async (model, messages, params = {}, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/chat/completions`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Default parameters aligned with Llama.cpp server
    const defaultParams = {
      max_tokens: 100,
      temperature: 0.7,
      top_p: 0.9,
      repeat_penalty: 1.1,
      top_k: 40,
      echo: false
    };
    
    // Merge default and provided parameters
    const mergedParams = { ...defaultParams, ...params };
    
    // Create payload
    const payload = {
      model: model,
      messages: messages,
      ...mergedParams
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
 * Create embeddings using a Llama model
 * @param {string} model - The model ID
 * @param {string|Array<string>} input - Text to embed
 * @param {Object} [params={}] - Additional parameters
 * @param {string} [apiKey=null] - Optional API key
 * @returns {Promise<Object>} - Embedding response
 */
export const createEmbeddings = async (model, input, params = {}, apiKey = null) => {
  try {
    const url = `${API_BASE_URL}/embeddings`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Handle single string vs array inputs
    const textInput = Array.isArray(input) ? input : [input];
    
    // Create payload
    const payload = {
      model: model,
      input: textInput,
      ...params
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