/**
 * Model Adapter Service
 * Provides adapters for different model types (mock or real) to standardize interaction
 */

import { getHuggingFaceModel } from './huggingFaceService';

/**
 * Creates an appropriate model adapter based on the model configuration
 * @param {Object} modelConfig - Configuration for the model
 * @returns {Object} - Model adapter with standardized interface
 */
export const createModelAdapter = async (modelConfig) => {
  // If using a real model from Hugging Face
  if (modelConfig.useRealModel) {
    return await createHuggingFaceAdapter(modelConfig);
  }
  
  // Default to mock model if not using real model
  return createMockAdapter(modelConfig);
};

/**
 * Creates an adapter for Hugging Face models
 * @param {Object} modelConfig - Configuration for the Hugging Face model
 * @returns {Object} - Model adapter with standardized interface
 */
const createHuggingFaceAdapter = async (modelConfig) => {
  try {
    // Initialize the Hugging Face model
    const model = await getHuggingFaceModel(modelConfig.selectedModel);
    
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
          throw error;
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
 * Creates a mock model adapter for testing without real models
 * @param {Object} modelConfig - Configuration for the mock model
 * @returns {Object} - Model adapter with standardized interface
 */
const createMockAdapter = (modelConfig) => {
  return {
    modelType: 'mock',
    modelId: 'mock-model',
    source: 'mock',
    
    /**
     * Get a prediction from the mock model
     * @param {string} input - The input text to predict on
     * @returns {Promise<Object>} - The mock prediction result
     */
    getPrediction: async (input) => {
      // Wait a random time to simulate processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
      
      // Generate different responses based on input patterns
      let prediction;
      
      if (input.toLowerCase().includes('capital') && input.toLowerCase().includes('france')) {
        prediction = "The capital of France is Paris.";
      } else if (input.toLowerCase().includes('hello') && input.toLowerCase().includes('spanish')) {
        prediction = "Hello in Spanish is 'Hola'.";
      } else if (input.toLowerCase().includes('hack') || input.toLowerCase().includes('illegal')) {
        prediction = "I'm sorry, I cannot provide information on illegal activities or hacking.";
      } else {
        // Default mock response
        prediction = `Mock response to: "${input.substring(0, 30)}${input.length > 30 ? '...' : ''}"`;
      }
      
      return {
        prediction,
        confidence: Math.random() * 0.4 + 0.6, // Random confidence between 0.6 and 1.0
        raw: { generated_text: prediction }
      };
    },
    
    /**
     * Get model information
     * @returns {Object} - Information about the mock model
     */
    getModelInfo: () => {
      return {
        name: "Mock Model",
        type: 'mock',
        parameters: modelConfig.parameters || {}
      };
    }
  };
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