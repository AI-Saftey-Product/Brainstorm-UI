/**
 * Model Storage Service
 * Provides local storage for model configurations
 */

// Storage keys
const MODEL_CONFIGS_KEY = 'brainstormModelConfigs';
const MODEL_TEST_RESULTS_KEY = 'brainstormModelTestResults';
const API_BASE_URL = import.meta.env.VITE_TESTS_API_URL || 'http://localhost:8000';
/**
 * Get saved model configurations from localStorage
 * @returns {Array} Array of saved model configurations
 */

/**
 * Save a model configuration to localStorage
 * @param {Object} config - Model configuration to save
 * @returns {Object} Saved configuration with ID
 */
export const saveModelConfig = (config) => {
    try {
        // Get existing configurations
        const configs = getSavedModelConfigs();

        // Generate an ID if one doesn't exist
        const configWithId = {
            ...config,
            id: config.id || Date.now().toString(),
            lastModified: new Date().toISOString()
        };

        // Add to array and save
        const updatedConfigs = [...configs.filter(c => c.id !== configWithId.id), configWithId];
        localStorage.setItem(MODEL_CONFIGS_KEY, JSON.stringify(updatedConfigs));

        return configWithId;
    } catch (error) {
        return null;
    }
};

/**
 * Save test results for a model
 * @param {string} modelId - ID of the model
 * @param {Object} results - Test results to save
 * @returns {Object} Saved results with timestamp
 */
export const saveModelTestResults = (modelId, results) => {
    try {
        if (!modelId) {
            throw new Error('Model ID is required');
        }

        // Get existing results
        const allResults = getModelTestResultsMap();

        // Create a new result entry
        const resultEntry = {
            ...results,
            modelId,
            timestamp: new Date().toISOString()
        };

        // Add to the array for this model
        const modelResults = allResults[modelId] || [];
        modelResults.push(resultEntry);
        allResults[modelId] = modelResults;

        // Save back to localStorage
        localStorage.setItem(MODEL_TEST_RESULTS_KEY, JSON.stringify(allResults));

        return resultEntry;
    } catch (error) {
        return null;
    }
};

/**
 * Get test results for a specific model
 * @param {string} modelId - ID of the model
 * @returns {Array} Array of test results for the model
 */
export const getModelTestResults = (modelId) => {
    try {
        if (!modelId) {
            return [];
        }

        const allResults = getModelTestResultsMap();
        return allResults[modelId] || [];
    } catch (error) {
        return [];
    }
};

/**
 * Get all test results as a map by model ID
 * @returns {Object} Map of test results by model ID
 */
export const getModelTestResultsMap = () => {
    try {
        const resultsString = localStorage.getItem(MODEL_TEST_RESULTS_KEY);
        return resultsString ? JSON.parse(resultsString) : {};
    } catch (error) {
        return {};
    }
};

/**
 * Delete a model configuration
 * @param {string} id - ID of the configuration to delete
 * @returns {boolean} Whether the deletion was successful
 */
export const deleteModelConfig = (id) => {
    console.log(JSON.stringify([id]))
    fetch(`${API_BASE_URL}/api/models/delete_models`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([id]),
    })
        .then(res => {
            if (!res.ok) throw new Error("Network error");
        })
};

/**
 * Get a model configuration by ID
 * @param {string} id - ID of the configuration to get
 * @returns {Object|null} The model configuration or null if not found
 */
export const getModelConfigById = (id) => {
    if (!id) {
        return null;
    }

    const configs = getSavedModelConfigs();
    return configs.find(config => config.id === id) || null;
};

/**
 * Update a model configuration
 * @param {string} id - ID of the configuration to update
 * @param {Object} updates - Properties to update
 * @returns {Object|null} The updated configuration or null if update failed
 */
export const updateModelConfig = (id, updates) => {
    try {
        if (!id) {
            return null;
        }

        // Get existing configuration
        const config = getModelConfigById(id);
        if (!config) {
            return null;
        }

        // Update the configuration
        const updatedConfig = {
            ...config,
            ...updates,
            id, // Ensure ID doesn't change
            lastModified: new Date().toISOString()
        };

        // Save the updated configuration
        return saveModelConfig(updatedConfig);
    } catch (error) {
        return null;
    }
}; 