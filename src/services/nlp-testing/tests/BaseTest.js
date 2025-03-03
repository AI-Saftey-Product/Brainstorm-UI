/**
 * Base Test Class for NLP Testing
 */

import { TEST_STATUS, TEST_SEVERITY, DEFAULT_TEST_PARAMS } from '../types';

export class BaseTest {
  constructor(config = {}) {
    this.id = config.id || crypto.randomUUID();
    this.name = config.name || 'Unnamed Test';
    this.description = config.description || '';
    this.category = config.category;
    this.modelType = config.modelType;
    this.severity = config.severity || TEST_SEVERITY.MEDIUM;
    this.params = { ...DEFAULT_TEST_PARAMS, ...(config.params || {}) };
    this.startTime = null;
    this.endTime = null;
    this.status = null;
    this.results = null;
    this.error = null;
    this.logs = [];
  }

  /**
   * Initialize test resources
   */
  async setup() {
    this.startTime = new Date();
    this.log('Test setup started');
  }

  /**
   * Clean up test resources
   */
  async teardown() {
    this.endTime = new Date();
    this.log('Test completed');
  }

  /**
   * Run the test
   * @param {Object} modelAdapter - Model adapter instance
   * @returns {Object} Test results
   */
  async run(modelAdapter) {
    try {
      await this.setup();
      
      // Implement test logic in derived classes
      throw new Error('run() method must be implemented by derived test classes');
      
    } catch (error) {
      this.error = error;
      this.status = TEST_STATUS.ERROR;
      this.log(`Test failed with error: ${error.message}`);
      throw error;
    } finally {
      await this.teardown();
    }
  }

  /**
   * Add a log entry
   * @param {string} message - Log message
   */
  log(message) {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message });
  }

  /**
   * Get test duration in milliseconds
   */
  getDuration() {
    if (!this.startTime || !this.endTime) return 0;
    return this.endTime - this.startTime;
  }

  /**
   * Get test report
   */
  getReport() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      modelType: this.modelType,
      severity: this.severity,
      status: this.status,
      results: this.results,
      error: this.error ? this.error.message : null,
      duration: this.getDuration(),
      startTime: this.startTime,
      endTime: this.endTime,
      logs: this.logs
    };
  }

  /**
   * Validate test configuration
   * @param {Object} config - Test configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (!config) {
      throw new Error('Test configuration is required');
    }
    if (!config.category) {
      throw new Error('Test category is required');
    }
    if (!config.modelType) {
      throw new Error('Model type is required');
    }
  }

  /**
   * Check if test timeout has been exceeded
   * @throws {Error} If timeout exceeded
   */
  checkTimeout() {
    if (!this.startTime) return;
    const elapsed = new Date() - this.startTime;
    if (elapsed > this.params.timeoutSeconds * 1000) {
      throw new Error(`Test timeout exceeded (${this.params.timeoutSeconds}s)`);
    }
  }
} 