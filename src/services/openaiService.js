/**
 * OpenAI API Service
 * Provides functions to interact with OpenAI models
 */

import api from './api';

// OpenAI API endpoint
const API_URL = 'https://api.openai.com/v1';

/**
 * Get an OpenAI model interface
 * @param {string} modelId - The OpenAI model ID (e.g., "gpt-4", "gpt-3.5-turbo")
 * @param {string} apiKey - The OpenAI API key
 * @param {Object} options - Additional configuration options
 * @returns {Promise<Object>} - A model interface object
 */
export const getOpenAIModel = async (modelId, apiKey, options = {}) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key not provided');
    }
    
    // Attempt an initial query to verify the model works
    await queryModel(modelId, 'Hello, world!', apiKey, options);
    
    return {
      modelId,
      
      /**
       * Query the model
       * @param {string} input - The input text to query with
       * @returns {Promise<Object|string>} - The model's response
       */
      query: async (input) => {
        return await queryModel(modelId, input, apiKey, options);
      },
      
      /**
       * Get model information
       * @returns {Promise<Object>} - Model information
       */
      getInfo: async () => {
        return {
          id: modelId,
          name: modelId,
          provider: 'openai',
        };
      }
    };
  } catch (error) {
    throw new Error(`Failed to initialize model ${modelId}: ${error.message}`);
  }
};

/**
 * Get a model adapter for a specified OpenAI model
 * 
 * @param {Object} modelConfig - Configuration for the model
 * @param {Object} options - Additional options
 * @returns {Object} Model adapter for interacting with the model
 */
export const getOpenAIModelAdapter = async (modelConfig, options = {}) => {
  const verbose = modelConfig.verbose || options.verbose || false;
  
  if (!modelConfig.model_id) {
    throw new Error('Model ID is required in the configuration');
  }
  
  if (!modelConfig.api_key) {
    throw new Error('API key is required in the configuration');
  }
  
  const modelId = modelConfig.model_id;
  const apiKey = modelConfig.api_key;
  
  try {
    // Extract OpenAI specific parameters
    const modelParams = {
      temperature: Number(modelConfig.temperature || 0.7),
      max_tokens: Number(modelConfig.max_tokens || 1024),
      frequency_penalty: Number(modelConfig.frequency_penalty || 0),
      presence_penalty: Number(modelConfig.presence_penalty || 0),
      organization_id: modelConfig.organization_id || undefined
    };
    
    // Make a test call to the model with a simple input
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // Add organization header if provided
    if (modelParams.organization_id) {
      headers['OpenAI-Organization'] = modelParams.organization_id;
    }
    
    // Determine if we should use chat or completion endpoint
    const isChatModel = modelId.includes('gpt-3.5') || modelId.includes('gpt-4');
    const endpoint = isChatModel ? 'chat/completions' : 'completions';
    
    const payload = isChatModel
      ? {
          model: modelId,
          messages: [{ role: 'user', content: 'Hello, testing model connectivity' }],
          temperature: Number(modelParams.temperature),
          max_tokens: Number(modelParams.max_tokens),
          frequency_penalty: Number(modelParams.frequency_penalty),
          presence_penalty: Number(modelParams.presence_penalty)
        }
      : {
          model: modelId,
          prompt: 'Hello, testing model connectivity',
          temperature: Number(modelParams.temperature),
          max_tokens: Number(modelParams.max_tokens),
          frequency_penalty: Number(modelParams.frequency_penalty),
          presence_penalty: Number(modelParams.presence_penalty)
        };
    
    const testResponse = await api.request(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      throw new Error(`Failed to initialize model: ${testResponse.status} ${testResponse.statusText} - ${errorData.error?.message || ''}`);
    }
    
    // Create a model adapter that uses the OpenAI API
    const modelAdapter = {
      name: modelConfig.name,
      modality: modelConfig.modality,
      sub_type: modelConfig.sub_type,
      source: 'openai',
      model_id: modelId,
      api_key: apiKey,
      parameters: modelParams,
      verbose,
      
      // Method for generating predictions from the model
      getPrediction: async (input) => {
        try {
          const result = await queryModel(modelId, input, apiKey, {
            ...modelParams,
            verbose
          });
          
          // Process the response
          const processedResult = processOpenAIResponse(result, isChatModel);
          
          // Ensure the response has both prediction and text fields
          return {
            ...processedResult,
            text: processedResult.prediction,
            raw: result
          };
        } catch (error) {
          throw error;
        }
      },

      /**
       * Get model information
       * @returns {Object} - Information about the model
       */
      getModelInfo: () => {
        const info = {
          name: modelConfig.name,
          modality: modelConfig.modality,
          sub_type: modelConfig.sub_type,
          source: 'openai',
          model_id: modelId,
          parameters: {
            temperature: modelParams.temperature,
            max_tokens: modelParams.max_tokens,
            frequency_penalty: modelParams.frequency_penalty,
            presence_penalty: modelParams.presence_penalty
          }
        };
        return info;
      }
    };

    // Test the getPrediction method to ensure it's working
    try {
      await modelAdapter.getPrediction("Test input");
    } catch (error) {
      throw new Error(`Model adapter initialization failed: ${error.message}`);
    }

    return modelAdapter;
  } catch (error) {
    throw error;
  }
};

/**
 * Query an OpenAI model
 * @param {string} modelId - The OpenAI model ID
 * @param {string} input - The input text
 * @param {string} apiKey - The OpenAI API key
 * @param {Object} options - Additional options including model parameters
 * @returns {Promise<Object|string>} - The model's response
 */
const queryModel = async (modelId, input, apiKey, options = {}) => {
  const verbose = options.verbose || false;
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    // Add organization header if provided
    if (options.organization_id) {
      headers['OpenAI-Organization'] = options.organization_id;
    }
    
    // Determine if we should use chat or completion endpoint
    const isChatModel = modelId.includes('gpt-3.5') || modelId.includes('gpt-4');
    const endpoint = isChatModel ? 'chat/completions' : 'completions';
    
    const payload = isChatModel
      ? {
          model: modelId,
          messages: [{ role: 'user', content: input }],
          temperature: Number(options.temperature || 0.7),
          max_tokens: Number(options.max_tokens || 1024),
          frequency_penalty: Number(options.frequency_penalty || 0),
          presence_penalty: Number(options.presence_penalty || 0)
        }
      : {
          model: modelId,
          prompt: input,
          temperature: Number(options.temperature || 0.7),
          max_tokens: Number(options.max_tokens || 1024),
          frequency_penalty: Number(options.frequency_penalty || 0),
          presence_penalty: Number(options.presence_penalty || 0)
        };
    
    const response = await api.request(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
    }
    
    const result = await response.json();
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Process OpenAI API response into a standardized format
 * @param {Object} response - Raw OpenAI API response
 * @param {boolean} isChatModel - Whether the model is a chat model
 * @returns {Object} - Processed response with prediction and confidence
 */
const processOpenAIResponse = (response, isChatModel) => {
  try {
    let prediction = '';
    let confidence = 0;
    
    if (isChatModel && response.choices && response.choices.length > 0) {
      // Handle chat completion models (gpt-3.5, gpt-4)
      prediction = response.choices[0].message.content || '';
      // Calculate a confidence score based on the finish_reason
      // (stopped = 1.0, length = 0.8, etc.)
      confidence = response.choices[0].finish_reason === 'stop' ? 1.0 : 0.8;
    } else if (response.choices && response.choices.length > 0) {
      // Handle completion models
      prediction = response.choices[0].text || '';
      confidence = response.choices[0].finish_reason === 'stop' ? 1.0 : 0.8;
    } else {
      // Fallback for unexpected response format
      prediction = JSON.stringify(response);
      confidence = 0.5;
    }
    
    return {
      prediction,
      confidence
    };
  } catch (error) {
    return {
      prediction: 'Error processing model response',
      confidence: 0
    };
  }
};

/**
 * Generate text using OpenAI's completion API
 * @param {string} model - OpenAI model ID (e.g. "gpt-3.5-turbo")
 * @param {string} prompt - Input prompt
 * @param {Object} params - Additional parameters
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Generated text response
 */
export const generateText = async (model, prompt, params = {}, apiKey) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    // Determine if we're using Chat or Completion API based on model
    const isChatModel = model.includes('gpt');
    const endpoint = isChatModel ? 'chat/completions' : 'completions';
    
    // Default parameters
    const defaultParams = {
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
    
    // Create request payload
    const payload = {
      ...defaultParams,
      ...params,
      model
    };
    
    // Format differently for chat vs. completion models
    if (isChatModel) {
      payload.messages = [
        { role: 'user', content: prompt }
      ];
    } else {
      payload.prompt = prompt;
    }
    
    // Send API request
    const response = await api.request(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    // Extract and format the response
    let result;
    if (isChatModel && response.choices && response.choices[0]) {
      result = {
        text: response.choices[0].message.content,
        model,
        usage: response.usage,
        raw: response
      };
    } else if (response.choices && response.choices[0]) {
      result = {
        text: response.choices[0].text,
        model,
        usage: response.usage,
        raw: response
      };
    } else {
      throw new Error('Unexpected response format from OpenAI API');
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if an OpenAI model is available
 * @param {string} model - OpenAI model ID
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<boolean>} Whether the model is available
 */
export const checkModelAvailability = async (model, apiKey) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Get available models
    const models = await getAvailableModels(apiKey);
    
    // Check if requested model is in the list
    return models.some(m => m.id === model);
  } catch (error) {
    return false;
  }
};

/**
 * Get available OpenAI models
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Array>} List of available models
 */
export const getAvailableModels = async (apiKey) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    const response = await api.request(`${API_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get details about a specific OpenAI model
 * @param {string} model - OpenAI model ID
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Model details
 */
export const getModelDetails = async (model, apiKey) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    const response = await api.request(`${API_URL}/models/${model}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create embeddings using OpenAI's embedding API
 * @param {string} model - OpenAI embedding model (e.g. "text-embedding-ada-002") 
 * @param {string|Array<string>} input - Text to embed
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Embedding response
 */
export const createEmbeddings = async (model, input, apiKey) => {
  try {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Handle single string vs array inputs
    const textInput = Array.isArray(input) ? input : [input];
    
    const response = await api.request(`${API_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: textInput
      })
    });
    
    return response;
  } catch (error) {
    throw error;
  }
}; 