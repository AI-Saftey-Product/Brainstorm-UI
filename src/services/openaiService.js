/**
 * OpenAI API Service
 * Provides functions to interact with OpenAI models
 */

import api from './api';

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1';

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
    console.error(`Error initializing OpenAI model ${modelId}:`, error);
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
  
  if (verbose) {
    console.log('=== OpenAI Model Initialization ===');
    console.log(`Model ID: ${modelId}`);
    console.log(`Model Type: ${modelConfig.sub_type}`);
    console.log('Starting initialization process...');
  }
  
  try {
    if (verbose) console.log('Verifying model accessibility...');
    
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
    
    const testResponse = await fetch(`${OPENAI_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      if (verbose) console.error('Model initialization failed:', errorData);
      throw new Error(`Failed to initialize model: ${testResponse.status} ${testResponse.statusText} - ${errorData.error?.message || ''}`);
    }
    
    if (verbose) console.log('Model successfully verified. Creating model adapter...');
    
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
          if (verbose) {
            console.log('=== Making Prediction Request ===');
            console.log(`Input: ${input}`);
          }
          
          const result = await queryModel(modelId, input, apiKey, {
            ...modelParams,
            verbose
          });
          
          if (verbose) console.log('Processing prediction response...');
          
          // Process the response
          const processedResult = processOpenAIResponse(result, isChatModel);
          
          if (verbose) {
            console.log('Processed prediction result:');
            console.log(JSON.stringify(processedResult, null, 2));
          }
          
          // Ensure the response has both prediction and text fields
          return {
            ...processedResult,
            text: processedResult.prediction,
            raw: result
          };
        } catch (error) {
          if (verbose) console.error('Error in getPrediction:', error);
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
        if (verbose) {
          console.log('Model Information:');
          console.log(JSON.stringify(info, null, 2));
        }
        return info;
      }
    };

    // Test the getPrediction method to ensure it's working
    if (verbose) console.log('Testing model prediction...');
    try {
      await modelAdapter.getPrediction("Test input");
      if (verbose) console.log('Model prediction test successful');
    } catch (error) {
      if (verbose) console.error('Model prediction test failed:', error);
      throw new Error(`Model adapter initialization failed: ${error.message}`);
    }

    if (verbose) console.log('=== Model Initialization Complete ===');
    return modelAdapter;
  } catch (error) {
    if (verbose) {
      console.error('=== Model Initialization Failed ===');
      console.error('Error details:', error);
    }
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
    if (verbose) console.log(`Querying OpenAI model ${modelId}...`);
    
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
    
    if (verbose) {
      console.log('OpenAI API Request:');
      console.log(`Endpoint: ${OPENAI_API_URL}/${endpoint}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));
    }
    
    const response = await fetch(`${OPENAI_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (verbose) console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
    }
    
    const result = await response.json();
    
    if (verbose) {
      console.log('OpenAI API Response:');
      console.log(JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('Error querying OpenAI model:', error);
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
    console.error('Error processing OpenAI response:', error);
    return {
      prediction: 'Error processing model response',
      confidence: 0
    };
  }
}; 