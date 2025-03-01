import api from './api';
import { MOCK_TESTS } from '../constants/testCategories';

// In a real application, these would be API calls
// For now, we'll use the mock data

/**
 * Get all available tests
 * @returns {Promise<Array>} List of tests
 */
export const getAllTests = async () => {
  try {
    // In a real app: return await api.get('/tests');
    const tests = Object.values(MOCK_TESTS).flat();
    return Promise.resolve(tests);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get tests filtered by category
 * @param {string} category Category name
 * @returns {Promise<Array>} List of tests in the category
 */
export const getTestsByCategory = async (category) => {
  try {
    // In a real app: return await api.get(`/tests/category/${category}`);
    const tests = MOCK_TESTS[category] || [];
    return Promise.resolve(tests);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Run tests with given configuration
 * @param {Array} testIds List of test IDs to run
 * @param {Object} modelAdapter Model adapter object
 * @param {Object} testParameters Test parameters
 * @returns {Promise<Object>} Test results
 */
export const runTests = async (testIds, modelAdapter, testParameters = {}) => {
  try {
    // For mock implementation, simulate API call with timeout
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Convert flat list to categories-based structure
    const allTests = Object.values(MOCK_TESTS).flat();
    
    // Find selected tests
    const testsToRun = allTests.filter(test => testIds.includes(test.id));
    
    // Generate mock results
    const results = {};
    const complianceScores = {};
    
    for (const test of testsToRun) {
      // Add delay for realism
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
      
      // Generate result (more likely to pass than fail)
      const pass = Math.random() > 0.3;
      const score = pass ? 
                Math.random() * 0.3 + 0.7 : // 0.7 - 1.0 for passed tests
                Math.random() * 0.5 + 0.2;  // 0.2 - 0.7 for failed tests
      
      // Mock recommendations
      const recommendations = pass ? 
        [] : 
        ["Improve model training with more diverse data.", 
         "Consider fine-tuning the model parameters.", 
         "Add more test cases to validation set."];
      
      // Store result
      results[test.id] = {
        test,
        result: {
          pass,
          score,
          message: `Test ${pass ? 'passed' : 'failed'} with score ${(score * 100).toFixed(1)}%`,
          metrics: {
            score,
            evaluated_inputs: Math.floor(Math.random() * 100) + 50,
            processing_time: Math.random() * 5 + 0.5
          },
          details: { 
            tested_with: testParameters[test.id] || {},
            timestamp: new Date().toISOString()
          },
          recommendations,
          timestamp: new Date().toISOString()
        }
      };
      
      // Update category scores
      if (!complianceScores[test.category]) {
        complianceScores[test.category] = { passed: 0, total: 0 };
      }
      
      complianceScores[test.category].total += 1;
      if (pass) {
        complianceScores[test.category].passed += 1;
      }
    }
    
    return Promise.resolve({ results, complianceScores });
  } catch (error) {
    return Promise.reject(error);
  }
};