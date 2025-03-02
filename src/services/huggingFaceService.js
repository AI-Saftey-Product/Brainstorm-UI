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
 * Get a model adapter for a specified Hugging Face model
 * 
 * @param {Object} modelConfig - Configuration for the model
 * @returns {Object} Model adapter for interacting with the model
 */
export const getHuggingFaceModelAdapter = async (modelConfig) => {
  // Determine the appropriate model based on the model type
  const modelId = getModelIdForType(modelConfig.modelType, modelConfig.modelCategory);
  
  // Create a model adapter that uses the Hugging Face API
  return {
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
        
        // Process and standardize the response format based on model type
        return processHuggingFaceResponse(result, modelConfig.modelType);
      } catch (error) {
        console.error('Error calling Hugging Face API:', error);
        throw error;
      }
    }
  };
};

/**
 * Process and standardize response from Hugging Face API based on model type
 * 
 * @param {Object} response - Raw response from Hugging Face API
 * @param {string} modelType - Type of model used
 * @returns {Object} Standardized prediction result
 */
const processHuggingFaceResponse = (response, modelType) => {
  // Process the response based on model type
  switch (modelType) {
    case 'Text Classification':
      return {
        prediction: response,
        confidence: response[0]?.score || 0,
        classification: response[0]?.label || '',
      };
      
    case 'Image Classification':
      return {
        prediction: response,
        confidence: response[0]?.score || 0,
        classification: response[0]?.label || '',
      };
      
    case 'Text Generation':
      return {
        prediction: response[0]?.generated_text || response,
        confidence: 0.9, // Text generation models typically don't provide confidence scores
      };
      
    default:
      // Default processing for other model types
      return {
        prediction: response,
        confidence: Array.isArray(response) ? response[0]?.score || 0.5 : 0.5,
      };
  }
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