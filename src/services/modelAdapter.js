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
  // Log the incoming model config for debugging
  console.log('Creating model adapter with config:', modelConfig);
  console.log('Model ID from config:', modelConfig.selectedModel || modelConfig.modelId || 'NOT SET');
  
  // Ensure the model has a valid selectedModel
  if (!modelConfig.selectedModel && modelConfig.modelId) {
    console.log('Setting missing selectedModel from modelId in adapter creation');
    modelConfig.selectedModel = modelConfig.modelId;
  }
  
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
    const apiKey = import.meta.env.VITE_HUGGING_FACE_API_KEY;
    if (!apiKey) {
      throw new Error('Hugging Face API key not found. Please add it to your .env file as VITE_HUGGING_FACE_API_KEY.');
    }

    // Check for valid model ID
    const modelId = modelConfig.selectedModel;
    if (!modelId || modelId === 'None' || modelId === 'undefined') {
      throw new Error('Missing or invalid Hugging Face model ID. Please ensure a valid model ID is specified in your model configuration.');
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
      apiKey: apiKey, // Store the API key for future use
      
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