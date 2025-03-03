/**
 * Model Adapter Service
 * Provides adapters for different model types to standardize interaction
 */

import { getHuggingFaceModel } from './huggingFaceService';

/**
 * Creates an appropriate model adapter based on the model configuration
 * @param {Object} modelConfig - Configuration for the model
 * @returns {Object} - Model adapter with standardized interface
 */
export const createModelAdapter = async (modelConfig) => {
  return await createHuggingFaceAdapter(modelConfig);
};

/**
 * Creates an adapter for Hugging Face models
 * @param {Object} modelConfig - Configuration for the Hugging Face model
 * @returns {Object} - Model adapter with standardized interface
 */
const createHuggingFaceAdapter = async (modelConfig) => {
  try {
    // Validate API key
    if (!import.meta.env.VITE_HUGGING_FACE_API_KEY) {
      throw new Error('Hugging Face API key not found. Please add it to your .env file as VITE_HUGGING_FACE_API_KEY.');
    }

    // Initialize the Hugging Face model
    console.log(`Initializing Hugging Face model with ID: ${modelConfig.selectedModel}`);
    const model = await getHuggingFaceModel(modelConfig.selectedModel);
    
    // Test the model with a simple query
    try {
      await model.query("Test query to verify model initialization");
      console.log("Model initialization successful");
    } catch (error) {
      console.error("Model initialization test failed:", error);
      throw new Error(`Model initialization failed: ${error.message}`);
    }
    
    return {
      modelType: 'huggingface',
      modelId: modelConfig.selectedModel,
      source: 'huggingface',
      
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
          name: modelConfig.selectedModel,
          type: 'huggingface',
          parameters: modelConfig.parameters || {}
        };
      }
    };
  } catch (error) {
    console.error('Error creating Hugging Face adapter:', error);
    throw error;
  }
};

/**
 * Extract confidence score from model response
 * @param {Object|Array|string} result - The model result
 * @returns {number} - Confidence score (0-1)
 */
const extractConfidence = (result) => {
  // Handle different response formats
  if (Array.isArray(result) && result.length > 0) {
    // If result is an array of scored responses
    if (result[0].score !== undefined) {
      return result[0].score;
    }
    return 0.8; // Default confidence for array responses
  } else if (typeof result === 'object') {
    // If result is an object with score/confidence
    if (result.score !== undefined) {
      return result.score;
    } else if (result.confidence !== undefined) {
      return result.confidence;
    }
    return 0.7; // Default confidence for object responses
  }
  
  // Default confidence
  return 0.5;
}; 