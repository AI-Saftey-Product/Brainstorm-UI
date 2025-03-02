/**
 * Tests Service
 * Handles test operations and execution
 */

import { MOCK_TESTS } from '../constants/testCategories';
import { runRealTests } from './realTestsService';

/**
 * Get all available tests
 * @returns {Array} All tests
 */
export const getAllTests = () => {
  const allTests = [];
  
  // Flatten tests object into array
  Object.keys(MOCK_TESTS).forEach(category => {
    allTests.push(...MOCK_TESTS[category]);
  });
  
  return allTests;
};

/**
 * Get tests by category
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered tests
 */
export const getTestsByCategory = (category) => {
  return MOCK_TESTS[category] || [];
};

/**
 * Run selected tests against the model
 * @param {Array} testIds - IDs of tests to run
 * @param {Object} modelAdapter - Adapter for interacting with the model
 * @param {Object} testParameters - Optional parameters for tests
 * @param {Function} logCallback - Optional callback for logging
 * @returns {Promise<Object>} Test results and compliance scores
 */
export const runTests = async (testIds, modelAdapter, testParameters = {}, logCallback = null) => {
  try {
    // If using a real model, use the real test implementation
    if (modelAdapter.source === 'huggingface') {
      if (logCallback) {
        logCallback('Using real test implementation for Hugging Face model');
      }
      return await runRealTests(testIds, modelAdapter, testParameters, logCallback);
    }
    
    // Otherwise, use mock test implementation
    if (logCallback) {
      logCallback('Using mock test implementation');
    }
    
    // Get tests from the list of IDs
    const allTests = getAllTests();
    const selectedTests = allTests.filter(test => testIds.includes(test.id));
    
    const results = {};
    const complianceScores = {};
    
    // Initialize category scores
    selectedTests.forEach(test => {
      if (!complianceScores[test.category]) {
        complianceScores[test.category] = { passed: 0, total: 0 };
      }
    });
    
    // Execute tests
    for (const test of selectedTests) {
      if (logCallback) {
        logCallback(`Running test: ${test.name}`);
      }
      
      // Simulate test execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      // Random pass/fail with higher chance of passing
      const pass = Math.random() > 0.3;
      const score = pass ? (Math.random() * 0.3 + 0.7) : (Math.random() * 0.6);
      
      // Record result
      results[test.id] = {
        test,
        result: {
          pass,
          score,
          message: `Test ${pass ? 'passed' : 'failed'} with ${(score * 100).toFixed(1)}% compliance score`,
          metrics: {
            accuracy: Math.random().toFixed(2),
            response_time: (Math.random() * 100 + 20).toFixed(1) + 'ms',
            samples: Math.floor(Math.random() * 100) + 10
          },
          recommendations: pass ? [] : [
            "Improve model response consistency",
            "Add more contextual awareness",
            "Enhance model with more training data"
          ],
          timestamp: new Date().toISOString()
        }
      };
      
      // Update category scores
      complianceScores[test.category].total += 1;
      if (pass) {
        complianceScores[test.category].passed += 1;
      }
      
      if (logCallback) {
        logCallback(`Test ${test.id} ${pass ? 'passed' : 'failed'} with score ${(score * 100).toFixed(1)}%`);
      }
    }
    
    // Calculate final scores and return results
    if (logCallback) {
      const totalPassed = Object.values(complianceScores).reduce((sum, score) => sum + score.passed, 0);
      const totalTests = Object.values(complianceScores).reduce((sum, score) => sum + score.total, 0);
      logCallback(`Testing completed. ${totalPassed}/${totalTests} tests passed.`);
    }
    
    return { results, complianceScores };
  } catch (error) {
    console.error('Error running tests:', error);
    throw error;
  }
};