import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFilteredTests } from '../services/testsService';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Model configuration state
  const [modelConfigured, setModelConfigured] = useState(false);
  const [modelConfig, setModelConfig] = useState(null);
  const [modelType, setModelType] = useState('');
  const [modelCategory, setModelCategory] = useState('');
  const [modelAdapter, setModelAdapter] = useState(null);

  // Test configuration state
  const [selectedTests, setSelectedTests] = useState([]);
  const [testParameters, setTestParameters] = useState({});
  const [testResults, setTestResults] = useState({});
  const [complianceScores, setComplianceScores] = useState({});
  const [availableTests, setAvailableTests] = useState([]);

  // Attempt to load state from localStorage on initial load
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('modelConfig');
      if (savedModel) {
        const parsedModel = JSON.parse(savedModel);
        
        // Set the model as configured
        setModelConfigured(true);
        
        // Map old field names to new field names if needed
        const normalizedConfig = {
          ...parsedModel,
          // Ensure both old and new field names are available
          name: parsedModel.name || parsedModel.modelName || 'Unnamed Model',
          modelName: parsedModel.name || parsedModel.modelName || 'Unnamed Model',
          
          modality: parsedModel.modality || parsedModel.modelCategory || 'NLP',
          modelCategory: parsedModel.modality || parsedModel.modelCategory || 'NLP',
          
          sub_type: parsedModel.sub_type || parsedModel.modelType || '',
          modelType: parsedModel.sub_type || parsedModel.modelType || '',
          
          model_id: parsedModel.model_id || parsedModel.modelId || parsedModel.selectedModel || '',
          modelId: parsedModel.model_id || parsedModel.modelId || parsedModel.selectedModel || '',
          selectedModel: parsedModel.model_id || parsedModel.modelId || parsedModel.selectedModel || '',
          
          source: parsedModel.source || 'huggingface',
          
          api_key: parsedModel.api_key || parsedModel.apiKey || '',
          apiKey: parsedModel.api_key || parsedModel.apiKey || ''
        };
        
        setModelConfig(normalizedConfig);
        setModelType(normalizedConfig.modelType || normalizedConfig.sub_type || '');
        setModelCategory(normalizedConfig.modelCategory || normalizedConfig.modality || '');
        setModelAdapter(normalizedConfig.modelAdapter);
      }

      const savedTests = localStorage.getItem('selectedTests');
      if (savedTests) {
        setSelectedTests(JSON.parse(savedTests));
      }

      const savedParams = localStorage.getItem('testParameters');
      if (savedParams) {
        setTestParameters(JSON.parse(savedParams));
      }

      const savedResults = localStorage.getItem('testResults');
      if (savedResults) {
        setTestResults(JSON.parse(savedResults));
      }

      const savedScores = localStorage.getItem('complianceScores');
      if (savedScores) {
        setComplianceScores(JSON.parse(savedScores));
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }
  }, []);

  // Remove automatic test fetching on model change
  // Instead provide a function that can be called explicitly
  const fetchTestsForModel = async (modelConfig) => {
    if (!modelConfig) return [];
    
    try {
      console.log('Explicitly fetching tests for model:', modelConfig);
      
      // Create API-compatible parameters
      const apiParams = {
        modality: modelConfig.modality || modelConfig.modelCategory || 'NLP',
        model_type: modelConfig.sub_type || modelConfig.modelType || ''
      };
      
      console.log('Sending API params for getFilteredTests:', apiParams);
      
      // Fetch tests based on model configuration
      const tests = await getFilteredTests(apiParams);
      console.log('Fetched available tests:', tests);
      setAvailableTests(tests);
      return tests;
    } catch (error) {
      console.error('Error fetching available tests:', error);
      setAvailableTests([]);
      return [];
    }
  };

  // Configure model
  const configureModel = (config) => {
    setModelConfigured(true);
    setModelConfig(config);
    setModelType(config.modelType || '');
    setModelCategory(config.modelCategory || '');
    setModelAdapter(config.modelAdapter);
    
    // Save to localStorage
    localStorage.setItem('modelConfig', JSON.stringify(config));
  };

  // Save test configuration
  const saveTestConfiguration = (tests) => {
    // Update selected tests
    setSelectedTests(tests);
    
    // Save to localStorage
    localStorage.setItem('selectedTests', JSON.stringify(tests));
    
    // Return true to indicate success
    return true;
  };

  // Update test parameters
  const updateTestParameter = (testId, params) => {
    setTestParameters(prev => {
      const updatedParams = {
        ...prev,
        [testId]: {
          ...(prev[testId] || {}),
          ...params
        }
      };
      
      // Save to localStorage
      localStorage.setItem('testParameters', JSON.stringify(updatedParams));
      
      return updatedParams;
    });
  };

  /**
   * Save test results and update the context state
   * @param {Object} results - Test results to save
   * @param {Object} scores - Compliance scores to save
   */
  const saveTestResults = (results, scores) => {
    console.log('[CONTEXT] saveTestResults called with:', {
      resultsType: typeof results,
      hasResults: results ? 'yes' : 'no',
      resultsLength: results ? Object.keys(results).length : 0,
      scoresType: typeof scores,
      hasScores: scores ? 'yes' : 'no',
      scoresLength: scores ? Object.keys(scores).length : 0,
    });

    // Validate that results is an object
    if (!results || typeof results !== 'object') {
      console.error('[CONTEXT] Invalid results provided to saveTestResults:', results);
      return false;
    }

    try {
      // Save to state
      setTestResults(results);
      setComplianceScores(scores || {});
      console.log('[CONTEXT] Successfully saved test results and scores to context');

      // Also save to localStorage for persistence
      try {
        const resultsToSave = JSON.stringify(results);
        localStorage.setItem('testResults', resultsToSave);
        console.log('[CONTEXT] Saved test results to localStorage:', resultsToSave.length, 'bytes');
        
        if (scores && Object.keys(scores).length > 0) {
          const scoresToSave = JSON.stringify(scores);
          localStorage.setItem('complianceScores', scoresToSave);
          console.log('[CONTEXT] Saved compliance scores to localStorage:', scoresToSave.length, 'bytes');
        }
        return true;
      } catch (storageError) {
        console.error('[CONTEXT] Error saving to localStorage:', storageError);
        return false;
      }
    } catch (error) {
      console.error('[CONTEXT] Error in saveTestResults:', error);
      return false;
    }
  };

  // Reset all data
  const resetAll = () => {
    setModelConfigured(false);
    setModelConfig(null);
    setModelType('');
    setModelCategory('');
    setModelAdapter(null);
    setSelectedTests([]);
    setTestParameters({});
    setTestResults({});
    setComplianceScores({});
    
    // Clear localStorage
    localStorage.removeItem('modelConfig');
    localStorage.removeItem('selectedTests');
    localStorage.removeItem('testParameters');
    localStorage.removeItem('testResults');
    localStorage.removeItem('complianceScores');
  };

  // For simulation/demo purposes, provide the mock test data
  // const MOCK_TESTS_DATA = MOCK_TESTS;

  return (
    <AppContext.Provider
      value={{
        // Model state
        modelConfigured,
        modelConfig,
        modelType,
        modelCategory,
        modelAdapter,
        configureModel,
        
        // Tests state
        selectedTests,
        testParameters,
        testResults,
        complianceScores,
        availableTests,
        
        // Functions
        saveTestConfiguration,
        updateTestParameter,
        saveTestResults,
        resetAll,
        fetchTestsForModel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};