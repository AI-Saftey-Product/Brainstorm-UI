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
 * Query a Hugging Face model
 * @param {string} modelId - The Hugging Face model ID
 * @param {string} input - The input text
 * @returns {Promise<Object|string>} - The model's response
 */
const queryModel = async (modelId, input) => {
  try {
    const response = await fetch(`${HUGGING_FACE_API_URL}${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: input }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error querying model ${modelId}:`, error);
    throw error;
  }
};

/**
 * Get a model adapter for a specified Hugging Face model
 * 
 * @param {Object} modelConfig - Configuration for the model
 * @returns {Object} Model adapter for interacting with the model
 */
export const getHuggingFaceModelAdapter = async (modelConfig) => {
  // Use the user-provided modelId if available, otherwise determine based on model type
  const modelId = modelConfig.modelId || getModelIdForType(modelConfig.modelType, modelConfig.modelCategory);
  
  try {
    // Verify the model exists and is accessible
    console.log(`Initializing Hugging Face model: ${modelId}`);
    
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
      throw new Error(`Failed to initialize model: ${testResponse.status} ${testResponse.statusText} - ${errorData.error || ''}`);
    }
    
    // Create a model adapter that uses the Hugging Face API
    const modelAdapter = {
      modelType: modelConfig.modelType,
      modelId,
      source: 'huggingface',
      
      // Method for generating predictions from the model
      getPrediction: async (input) => {
        try {
          // Make a call to the Hugging Face Inference API
          const response = await fetch(`${HUGGING_FACE_API_URL}${modelId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`
            },
            body: JSON.stringify({ inputs: input })
          });
          
          if (!response.ok) {
            throw new Error(`Error from Hugging Face API: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          // Process and standardize the response format
          const processedResult = processHuggingFaceResponse(result, modelConfig.modelType);
          
          // Ensure the response has both prediction and text fields
          return {
            ...processedResult,
            text: processedResult.prediction, // Ensure text field is always present
            raw: result
          };
        } catch (error) {
          console.error('Error calling Hugging Face API:', error);
          throw error;
        }
      },

      /**
       * Get model information
       * @returns {Object} - Information about the model
       */
      getModelInfo: () => {
        return {
          name: modelId,
          type: modelConfig.modelType || 'huggingface',
          category: modelConfig.modelCategory || 'text',
          parameters: modelConfig.parameters || {}
        };
      }
    };

    // Test the getPrediction method to ensure it's working
    try {
      await modelAdapter.getPrediction("Test input");
    } catch (error) {
      console.error("Error testing model adapter:", error);
      throw new Error(`Model adapter initialization failed: ${error.message}`);
    }

    return modelAdapter;
  } catch (error) {
    console.error(`Error initializing Hugging Face model ${modelId}:`, error);
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

/**
 * Map model type and category to an appropriate Hugging Face model ID
 * 
 * @param {string} modelType - Type of model
 * @param {string} category - Model category
 * @returns {string} Hugging Face model ID
 */
const getModelIdForType = (modelType, category) => {
  // Map of model types to recommended Hugging Face models
  const modelMap = {
    // NLP Models
    'Text Classification': 'distilbert-base-uncased-finetuned-sst-2-english',
    'Token Classification': 'dbmdz/bert-large-cased-finetuned-conll03-english',
    'Question Answering': 'distilbert-base-cased-distilled-squad',
    'Zero-Shot Classification': 'facebook/bart-large-mnli',
    'Translation': 'Helsinki-NLP/opus-mt-en-fr',
    'Summarization': 'facebook/bart-large-cnn',
    'Text Generation': 'gpt2',
    
    // Vision Models
    'Image Classification': 'google/vit-base-patch16-224',
    'Object Detection': 'facebook/detr-resnet-50',
    'Image Segmentation': 'facebook/detr-resnet-50-panoptic',
    
    // Audio Models
    'Audio Classification': 'superb/hubert-large-superb-er',
    'Automatic Speech Recognition': 'facebook/wav2vec2-base-960h',
    
    // Default models by category
    'DEFAULT_NLP': 'distilbert-base-uncased',
    'DEFAULT_Vision': 'google/vit-base-patch16-224',
    'DEFAULT_Audio': 'facebook/wav2vec2-base-960h',
    'DEFAULT_Multimodal': 'openai/clip-vit-base-patch32',
    'DEFAULT_Tabular': 'distilbert-base-uncased' // Fallback for tabular models
  };
  
  // Return the specific model for this type, or the default for the category
  return modelMap[modelType] || modelMap[`DEFAULT_${category}`] || 'distilbert-base-uncased';
};

export default {
  getHuggingFaceModelAdapter
}; 