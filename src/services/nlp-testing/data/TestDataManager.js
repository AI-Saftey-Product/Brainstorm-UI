/**
 * Test Data Management Service
 */

import fs from 'fs';
import path from 'path';

export class TestDataManager {
  constructor(config = {}) {
    this.dataDir = config.dataDir || path.join(process.cwd(), 'test-data');
    this.version = config.version || '1.0.0';
    this.datasets = {};
    this.initialize();
  }

  /**
   * Initialize data directory structure
   */
  initialize() {
    const directories = [
      'bias',
      'adversarial',
      'toxicity',
      'factual',
      'privacy',
      'metrics'
    ];

    // Create base directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Create subdirectories
    directories.forEach(dir => {
      const fullPath = path.join(this.dataDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * Load dataset from file
   * @param {string} category - Dataset category
   * @param {string} name - Dataset name
   * @returns {Object} Dataset
   */
  loadDataset(category, name) {
    const filePath = path.join(this.dataDir, category, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset not found: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.datasets[`${category}/${name}`] = data;
    return data;
  }

  /**
   * Save dataset to file
   * @param {string} category - Dataset category
   * @param {string} name - Dataset name
   * @param {Object} data - Dataset to save
   */
  saveDataset(category, name, data) {
    const filePath = path.join(this.dataDir, category, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    this.datasets[`${category}/${name}`] = data;
  }

  /**
   * Get bias test data
   * @returns {Object} Bias test data
   */
  getBiasTestData() {
    return {
      counterfactuals: this.loadDataset('bias', 'counterfactuals'),
      weatTests: this.loadDataset('bias', 'weat_tests'),
      demographicParity: this.loadDataset('bias', 'demographic_parity')
    };
  }

  /**
   * Get adversarial test data
   * @returns {Object} Adversarial test data
   */
  getAdversarialTestData() {
    return {
      perturbations: this.loadDataset('adversarial', 'perturbations'),
      attacks: this.loadDataset('adversarial', 'attacks'),
      robustness: this.loadDataset('adversarial', 'robustness')
    };
  }

  /**
   * Get toxicity test data
   * @returns {Object} Toxicity test data
   */
  getToxicityTestData() {
    return {
      realToxicityPrompts: this.loadDataset('toxicity', 'real_toxicity_prompts'),
      hateCheck: this.loadDataset('toxicity', 'hate_check'),
      customChallenges: this.loadDataset('toxicity', 'custom_challenges')
    };
  }

  /**
   * Get factual consistency test data
   * @returns {Object} Factual consistency test data
   */
  getFactualTestData() {
    return {
      truthfulQA: this.loadDataset('factual', 'truthful_qa'),
      factCC: this.loadDataset('factual', 'fact_cc'),
      customFacts: this.loadDataset('factual', 'custom_facts')
    };
  }

  /**
   * Get privacy test data
   * @returns {Object} Privacy test data
   */
  getPrivacyTestData() {
    return {
      canaryExamples: this.loadDataset('privacy', 'canary_examples'),
      syntheticPII: this.loadDataset('privacy', 'synthetic_pii'),
      memorization: this.loadDataset('privacy', 'memorization')
    };
  }

  /**
   * Save test results
   * @param {string} category - Test category
   * @param {string} testId - Test ID
   * @param {Object} results - Test results
   */
  saveTestResults(category, testId, results) {
    const timestamp = new Date().toISOString();
    const resultsDir = path.join(this.dataDir, 'metrics', category);
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filePath = path.join(resultsDir, `${testId}_${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  }

  /**
   * Get test history
   * @param {string} category - Test category
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Test history
   */
  getTestHistory(category, limit = 10) {
    const resultsDir = path.join(this.dataDir, 'metrics', category);
    if (!fs.existsSync(resultsDir)) {
      return [];
    }

    const files = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, limit);

    return files.map(file => {
      const filePath = path.join(resultsDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
  }
} 