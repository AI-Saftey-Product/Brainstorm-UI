/**
 * Hugging Face API Service
 * Provides functions to interact with Hugging Face models
 */

import api from './api';

// Hugging Face Inference API endpoint
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/';

// Get API key from environment variables
const HUGGING_FACE_API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY || '';

/**
 * Get a Hugging Face model interface
 * @param {string} modelId - The Hugging Face model ID
 * @returns {Promise<Object>} - A model interface object
 */
export const getHuggingFaceModel = async (modelId) => {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('Hugging Face API key not found. Please add it to your .env file as VITE_HUGGING_FACE_API_KEY.');
    }
    
    // Attempt an initial query to verify the model works
    await queryModel(modelId, 'Hello, world!');
    
    return {
      modelId,
      
      /**
       * Query the model
       * @param {string} input - The input text to query with
       * @returns {Promise<Object|string>} - The model's response
       */
      query: async (input) => {
        return await queryModel(modelId, input);
      },
      
      /**
       * Get model information
       * @returns {Promise<Object>} - Model information
       */
      getInfo: async () => {
        return {
          id: modelId,
          name: modelId.includes('/') ? modelId.split('/')[1] : modelId,
          provider: 'huggingface',
        };
      }
    };
  } catch (error) {
    console.error(`Error initializing Hugging Face model ${modelId}:`, error);
    throw new Error(`Failed to initialize model ${modelId}: ${error.message}`);
  }
};

/**
 * Get a model adapter for a specified Hugging Face model
 * 
 * @param {Object} modelConfig - Configuration for the model
 * @param {Object} options - Additional options
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Object} Model adapter for interacting with the model
 */
export const getHuggingFaceModelAdapter = async (modelConfig, options = {}) => {
  const verbose = options.verbose || false;
  
  if (!modelConfig.modelId) {
    throw new Error('Model ID is required in the configuration');
  }
  
  const modelId = modelConfig.modelId;
  
  if (verbose) {
    console.log('=== Hugging Face Model Initialization ===');
    console.log(`Model ID: ${modelId}`);
    console.log(`Model Type: ${modelConfig.modelType}`);
    console.log(`Model Category: ${modelConfig.modelCategory}`);
    console.log('Starting initialization process...');
  }
  
  try {
    if (verbose) console.log('Verifying model accessibility...');
    
    // Make a test call to the model with a simple input
    const testResponse = await fetch(`${HUGGING_FACE_API_URL}${modelId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`
      },
      body: JSON.stringify({ inputs: "Hello, testing model connectivity" })
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      if (verbose) console.error('Model initialization failed:', errorData);
      throw new Error(`Failed to initialize model: ${testResponse.status} ${testResponse.statusText} - ${errorData.error || ''}`);
    }
    
    if (verbose) console.log('Model successfully verified. Creating model adapter...');
    
    // Create a model adapter that uses the Hugging Face API
    const modelAdapter = {
      modelType: modelConfig.modelType,
      modelId,
      source: 'huggingface',
      verbose,
      
      // Method for generating predictions from the model
      getPrediction: async (input) => {
        try {
          if (verbose) {
            console.log('=== Making Prediction Request ===');
            console.log(`Input: ${input}`);
          }
          
          const result = await queryModel(modelId, input, { verbose });
          
          if (verbose) console.log('Processing prediction response...');
          
          // Process and standardize the response format
          const processedResult = processHuggingFaceResponse(result, modelConfig.modelType);
          
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
          name: modelId,
          type: modelConfig.modelType || 'huggingface',
          category: modelConfig.modelCategory || 'text',
          parameters: modelConfig.parameters || {}
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
 * Query a Hugging Face model
 * @param {string} modelId - The Hugging Face model ID
 * @param {string} input - The input text
 * @param {Object} options - Additional options
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Promise<Object|string>} - The model's response
 */
const queryModel = async (modelId, input, options = {}) => {
  const verbose = options.verbose || false;
  
  try {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (verbose) {
        console.log(`\nAttempt ${attempt} of ${maxRetries}`);
        console.log(`Querying model: ${modelId}`);
      }
      
      try {
        if (verbose) console.log('Sending request to Hugging Face API...');
        
        const response = await fetch(`${HUGGING_FACE_API_URL}${modelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            inputs: input,
            options: { wait_for_model: true }
          }),
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          if (verbose) console.error('Request failed:', errorText);
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        if (verbose) console.log('Successfully received response from API');
        
        const data = await response.json();
        
        if (verbose) {
          console.log('Response data:');
          console.log(JSON.stringify(data, null, 2));
        }
        
        return data;
      } catch (error) {
        if (verbose) {
          console.warn(`Attempt ${attempt} failed:`);
          console.warn(error.message);
        }
        
        lastError = error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          if (verbose) console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError;
  } catch (error) {
    if (verbose) console.error('All query attempts failed:', error);
    throw error;
  }
};

/**
 * Process and standardize response from Hugging Face API based on model type
 * 
 * @param {Object} response - Raw response from Hugging Face API
 * @param {string} modelType - Type of model used
 * @returns {Object} Standardized prediction result
 */
const processHuggingFaceResponse = (response, modelType) => {
  let prediction;
  let confidence = 0.5;

  // Handle different response formats
  if (Array.isArray(response)) {
    if (response[0]?.generated_text) {
      prediction = response[0].generated_text;
      confidence = response[0].score || 0.5;
    } else if (response[0]?.text) {
      prediction = response[0].text;
      confidence = response[0].score || 0.5;
    } else {
      prediction = JSON.stringify(response[0]);
    }
  } else if (typeof response === 'object') {
    if (response.generated_text) {
      prediction = response.generated_text;
      confidence = response.score || 0.5;
    } else if (response.text) {
      prediction = response.text;
      confidence = response.score || 0.5;
    } else {
      prediction = JSON.stringify(response);
    }
  } else if (typeof response === 'string') {
    prediction = response;
  } else {
    prediction = JSON.stringify(response);
  }

  return {
    prediction,
    confidence,
    classification: typeof response === 'object' && response.label ? response.label : undefined
  };
};

export default {
  getHuggingFaceModelAdapter
}; 