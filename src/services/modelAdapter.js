/**
 * Model Adapter Service
 * Provides adapters for different model types to standardize interaction
 */

import { getHuggingFaceModel } from './huggingFaceService';
import { getOpenAIModelAdapter } from './openaiService';

/**
 * Creates an appropriate model adapter based on the model configuration
 * @param {Object} modelConfig - Configuration for the model
 * @returns {Object} - Model adapter with standardized interface
 */
export const createModelAdapter = async (modelConfig) => {
  // Log the incoming model config for debugging
  console.log('Creating model adapter with config:', modelConfig);
  
  // Validate required fields for the API
  if (!modelConfig.name) {
    throw new Error('Model name is required');
  }
  
  if (!modelConfig.modality) {
    throw new Error('Model modality is required');
  }
  
  if (!modelConfig.sub_type) {
    throw new Error('Model sub_type is required');
  }
  
  if (!modelConfig.source) {
    throw new Error('Model source is required');
  }
  
  if (!modelConfig.model_id) {
    throw new Error('Model ID is required');
  }
  
  // Create the appropriate adapter based on source
  switch (modelConfig.source.toLowerCase()) {
    case 'huggingface':
      return await createHuggingFaceAdapter(modelConfig);
    case 'openai':
      return await createOpenAIAdapter(modelConfig);
    case 'custom':
      return await createCustomAdapter(modelConfig);
    default:
      throw new Error(`Unsupported model source: ${modelConfig.source}`);
  }
};

/**
 * Creates an adapter for Hugging Face models
 * @param {Object} modelConfig - Configuration for the Hugging Face model
 * @returns {Object} - Model adapter with standardized interface
 */
const createHuggingFaceAdapter = async (modelConfig) => {
  try {
    // Validate HuggingFace specific required fields
    if (!modelConfig.api_key) {
      throw new Error('API key is required for HuggingFace models');
    }

    // Check for valid model ID
    const modelId = modelConfig.model_id;
    if (!modelId || modelId === 'None' || modelId === 'undefined') {
      throw new Error('Missing or invalid Hugging Face model ID');
    }

    // Initialize the Hugging Face model
    console.log(`Initializing Hugging Face model with ID: ${modelId}`);
    const model = await getHuggingFaceModel(modelId, modelConfig.api_key);
    
    // Test the model with a simple query
    try {
      await model.query("Test query to verify model initialization");
      console.log("Model initialization successful");
    } catch (error) {
      console.error("Model initialization test failed:", error);
      throw new Error(`Model initialization failed: ${error.message}`);
    }
    
    return {
      name: modelConfig.name,
      modality: modelConfig.modality,
      sub_type: modelConfig.sub_type,
      source: 'huggingface',
      model_id: modelId,
      api_key: modelConfig.api_key,
      
      /**
       * Get a prediction from the Hugging Face model
       * @param {string} input - The input text to predict on
       * @returns {Promise<Object>} - The prediction result
       */
      getPrediction: async (input) => {
        try {
          if (!input || typeof input !== 'string') {
            throw new Error('Invalid input: Input must be a non-empty string');
          }

          const result = await model.query(input);
          const prediction = typeof result === 'string' ? result : 
                           Array.isArray(result) ? result[0]?.generated_text || result[0] : 
                           result.generated_text || result.text || JSON.stringify(result);
          
          return {
            prediction,
            text: prediction,
            confidence: extractConfidence(result),
            raw: result
          };
        } catch (error) {
          console.error('Error getting prediction from Hugging Face model:', error);
          throw new Error(`Prediction failed: ${error.message}`);
        }
      },
      
      /**
       * Get model information
       * @returns {Object} - Information about the model
       */
      getModelInfo: () => {
        return {
          name: modelConfig.name,
          modality: modelConfig.modality,
          sub_type: modelConfig.sub_type,
          source: 'huggingface',
          model_id: modelId
        };
      }
    };
  } catch (error) {
    console.error('Error creating Hugging Face adapter:', error);
    throw error;
  }
};

/**
 * Creates an adapter for OpenAI models
 * @param {Object} modelConfig - Configuration for the OpenAI model
 * @returns {Object} - Model adapter with standardized interface
 */
const createOpenAIAdapter = async (modelConfig) => {
  try {
    // Validate OpenAI specific required fields
    if (!modelConfig.api_key) {
      throw new Error('API key is required for OpenAI models');
    }

    // Check for valid model ID
    const modelId = modelConfig.model_id;
    if (!modelId || modelId === 'None' || modelId === 'undefined') {
      throw new Error('Missing or invalid OpenAI model ID');
    }

    // Use the OpenAI adapter service
    return await getOpenAIModelAdapter(modelConfig, { verbose: modelConfig.verbose });
  } catch (error) {
    console.error('Error creating OpenAI adapter:', error);
    throw error;
  }
};

/**
 * Creates an adapter for custom models
 * @param {Object} modelConfig - Configuration for the custom model
 * @returns {Object} - Model adapter with standardized interface
 */
const createCustomAdapter = async (modelConfig) => {
  // This is a placeholder for custom model integration
  return {
    name: modelConfig.name,
    modality: modelConfig.modality,
    sub_type: modelConfig.sub_type,
    source: 'custom',
    model_id: modelConfig.model_id,
    
    getPrediction: async (input) => {
      throw new Error('Custom model integration is not yet implemented');
    },
    
    getModelInfo: () => {
      return {
        name: modelConfig.name,
        modality: modelConfig.modality,
        sub_type: modelConfig.sub_type,
        source: 'custom',
        model_id: modelConfig.model_id
      };
    }
  };
};

/**
 * Extract confidence score from model response
 * @param {Object} result - Raw model response
 * @returns {number} - Confidence score between 0 and 1
 */
const extractConfidence = (result) => {
  if (typeof result === 'object') {
    if (Array.isArray(result)) {
      return result[0]?.score || 0.5;
    }
    return result.score || 0.5;
  }
  return 0.5;
}; 