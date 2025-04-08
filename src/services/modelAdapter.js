/**
 * Model Adapter
 * Provides a consistent interface for working with different model types
 */

import * as huggingFaceService from './huggingFaceService';
import * as openaiService from './openaiService';

/**
 * Abstract model adapter class
 */
class ModelAdapter {
  constructor(modelConfig) {
    this.modelConfig = modelConfig;
    this.model = null;
    this.modelId = modelConfig?.model_id || modelConfig?.modelId || modelConfig?.selectedModel;
    this.modelName = modelConfig?.name || modelConfig?.modelName;
    this.initialized = false;
  }

  /**
   * Initialize the model connection
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Generate text from the model
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for the model
   * @returns {Promise<string>} The generated text
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Get model info
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      id: this.modelId,
      name: this.modelName,
      initialized: this.initialized,
      source: this.modelConfig?.source || 'unknown',
      type: this.modelConfig?.sub_type || this.modelConfig?.modelType || 'unknown',
      modality: this.modelConfig?.modality || this.modelConfig?.modelCategory || 'unknown'
    };
  }
}

/**
 * Hugging Face model adapter
 */
class HuggingFaceAdapter extends ModelAdapter {
  constructor(modelConfig) {
    super(modelConfig);
    this.apiKey = modelConfig?.api_key || modelConfig?.apiKey;
  }

  /**
   * Initialize the Hugging Face model
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      const initResult = await huggingFaceService.initializeModel(
        this.modelId,
        this.apiKey,
        this.modelConfig?.parameters || {}
      );
      
      this.initialized = initResult.success;
      return this.initialized;
    } catch (error) {
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate text using the Hugging Face model
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for the model
   * @returns {Promise<string>} The generated text
   */
  async generate(prompt, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const result = await huggingFaceService.getPrediction(
        this.modelId,
        prompt,
        {
          ...this.modelConfig?.parameters,
          ...options
        },
        this.apiKey
      );
      
      return result;
    } catch (error) {
      return `Error: ${error.message || 'Failed to generate text'}`;
    }
  }
}

/**
 * OpenAI model adapter
 */
class OpenAIAdapter extends ModelAdapter {
  constructor(modelConfig) {
    super(modelConfig);
    this.apiKey = modelConfig?.api_key || modelConfig?.apiKey;
    this.organizationId = modelConfig?.organization_id;
    this.temperature = modelConfig?.temperature !== undefined ? modelConfig.temperature : 0.7;
    this.maxTokens = modelConfig?.max_tokens || 1024;
  }

  /**
   * Initialize the OpenAI model
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      const initResult = await openaiService.initializeModel(
        this.modelId,
        this.apiKey,
        {
          organization_id: this.organizationId,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          ...this.modelConfig?.parameters
        }
      );
      
      this.initialized = initResult.success;
      return this.initialized;
    } catch (error) {
      this.initialized = false;
      return false;
    }
  }

  /**
   * Generate text using the OpenAI model
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for the model
   * @returns {Promise<string>} The generated text
   */
  async generate(prompt, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const result = await openaiService.getPrediction(
        this.modelId,
        prompt,
        {
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          ...this.modelConfig?.parameters,
          ...options
        },
        this.apiKey,
        this.organizationId
      );
      
      return result;
    } catch (error) {
      return `Error: ${error.message || 'Failed to generate text'}`;
    }
  }
}

/**
 * Create a model adapter for the given model configuration
 * @param {Object} modelConfig - Model configuration
 * @returns {ModelAdapter} Model adapter instance
 */
export const createModelAdapter = (modelConfig) => {
  try {
    const source = modelConfig?.source?.toLowerCase() || 'huggingface';
    
    if (source === 'openai') {
      return new OpenAIAdapter(modelConfig);
    } else {
      // Default to Hugging Face adapter
      return new HuggingFaceAdapter(modelConfig);
    }
  } catch (error) {
    // Return a basic adapter that will report the error when used
    return new ModelAdapter(modelConfig);
  }
}; 