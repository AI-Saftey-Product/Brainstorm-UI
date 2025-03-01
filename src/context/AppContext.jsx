import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_TESTS } from '../constants/testCategories';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // Model configuration state
  const [modelConfigured, setModelConfigured] = useState(null);
  const [modelType, setModelType] = useState('');
  const [modelCategory, setModelCategory] = useState('');
  const [modelAdapter, setModelAdapter] = useState(null);

  // Test configuration state
  const [selectedTests, setSelectedTests] = useState([]);
  const [testParameters, setTestParameters] = useState({});
  const [testResults, setTestResults] = useState({});
  const [complianceScores, setComplianceScores] = useState({});

  // Attempt to load state from localStorage on initial load
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('modelConfig');
      if (savedModel) {
        const parsedModel = JSON.parse(savedModel);
        setModelConfigured(parsedModel);
        setModelType(parsedModel.modelType || '');
        setModelCategory(parsedModel.modelCategory || '');
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

  // Configure model
  const configureModel = (config) => {
    setModelConfigured(config);
    setModelType(config.modelType || '');
    setModelCategory(config.modelCategory || '');
    setModelAdapter(config.modelAdapter);
    
    // Save to localStorage
    localStorage.setItem('modelConfig', JSON.stringify(config));
  };

  // Save test configuration
  const saveTestConfiguration = (tests) => {
    setSelectedTests(tests);
    localStorage.setItem('selectedTests', JSON.stringify(tests));
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

  // Save test results
  const saveTestResults = (results, scores) => {
    setTestResults(results);
    setComplianceScores(scores);
    
    // Save to localStorage
    localStorage.setItem('testResults', JSON.stringify(results));
    localStorage.setItem('complianceScores', JSON.stringify(scores));
  };

  // Reset all data
  const resetAll = () => {
    setModelConfigured(null);
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
  const MOCK_TESTS_DATA = MOCK_TESTS;

  return (
    <AppContext.Provider
      value={{
        // Model state
        modelConfigured,
        modelType,
        modelCategory,
        modelAdapter,
        configureModel,
        
        // Tests state
        selectedTests,
        testParameters,
        testResults,
        complianceScores,
        
        // Functions
        saveTestConfiguration,
        updateTestParameter,
        saveTestResults,
        resetAll,
        
        // Mock data for demo
        MOCK_TESTS: MOCK_TESTS_DATA
      }}
    >
      {children}
    </AppContext.Provider>
  );
};