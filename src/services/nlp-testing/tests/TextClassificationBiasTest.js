/**
 * Text Classification Bias Test
 */

import { BaseTest } from './BaseTest';
import { NLP_TEST_CATEGORIES, NLP_MODEL_TYPES, TEST_STATUS } from '../types';
import { MetricsService } from '../metrics/MetricsService';
import { TestDataManager } from '../data/TestDataManager';

export class TextClassificationBiasTest extends BaseTest {
  constructor(config = {}) {
    super({
      ...config,
      name: 'Text Classification Bias Test',
      description: 'Tests for bias in text classification across demographic groups',
      category: NLP_TEST_CATEGORIES.BIAS_FAIRNESS,
      modelType: NLP_MODEL_TYPES.TEXT_CLASSIFICATION
    });

    this.params = {
      ...this.params,
      disparityThreshold: config.params?.disparityThreshold || 0.1,
      weatThreshold: config.params?.weatThreshold || 0.5,
      useWeatTests: config.params?.useWeatTests || true,
      testCases: config.params?.testCases || null
    };

    this.metricsService = new MetricsService(config);
    this.dataManager = new TestDataManager(config);
  }

  /**
   * Load test cases from data manager
   */
  async loadTestCases() {
    if (this.params.testCases) {
      return this.params.testCases;
    }

    const biasData = await this.dataManager.getBiasTestData();
    return {
      counterfactuals: biasData.counterfactuals,
      weatTests: biasData.weatTests,
      demographicParity: biasData.demographicParity
    };
  }

  /**
   * Run WEAT tests for embeddings bias
   * @param {Object} modelAdapter - Model adapter instance
   * @param {Array} weatTests - WEAT test cases
   * @returns {Object} WEAT test results
   */
  async runWEATTests(modelAdapter, weatTests) {
    const results = {
      tests: [],
      overallBias: 0
    };

    for (const test of weatTests) {
      // Get embeddings for all words
      const words = [
        ...test.targetWords1,
        ...test.targetWords2,
        ...test.attributeWords1,
        ...test.attributeWords2
      ];

      const embeddings = {};
      for (const word of words) {
        const embedding = await modelAdapter.getEmbedding(word);
        embeddings[word] = embedding;
      }

      // Calculate WEAT score
      const weatResult = this.metricsService.calculateWEATScore(
        test.targetWords1,
        test.targetWords2,
        test.attributeWords1,
        test.attributeWords2,
        embeddings
      );

      results.tests.push({
        name: test.name,
        ...weatResult,
        isBiased: Math.abs(weatResult.effectSize) > this.params.weatThreshold
      });
    }

    // Calculate overall bias from effect sizes
    results.overallBias = results.tests.reduce(
      (acc, test) => acc + Math.abs(test.effectSize),
      0
    ) / results.tests.length;

    return results;
  }

  /**
   * Run demographic parity tests
   * @param {Object} modelAdapter - Model adapter instance
   * @param {Object} testCases - Test cases by demographic group
   * @returns {Object} Demographic parity results
   */
  async runDemographicParityTests(modelAdapter, testCases) {
    const results = {
      groups: {},
      disparities: [],
      maxDisparity: 0
    };

    // Get predictions for each group
    for (const [group, examples] of Object.entries(testCases)) {
      const predictions = [];
      const labels = [];

      for (const example of examples) {
        const prediction = await modelAdapter.getPrediction(example.text);
        predictions.push(prediction.confidence > 0.5 ? 1 : 0);
        labels.push(example.label);
      }

      // Calculate metrics for this group
      results.groups[group] = {
        metrics: this.metricsService.calculateClassificationMetrics(predictions, labels),
        size: examples.length
      };
    }

    // Calculate disparities between groups
    const groups = Object.keys(results.groups);
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i];
        const group2 = groups[j];
        
        const disparity = Math.abs(
          results.groups[group1].metrics.accuracy -
          results.groups[group2].metrics.accuracy
        );

        results.disparities.push({
          group1,
          group2,
          disparity
        });

        results.maxDisparity = Math.max(results.maxDisparity, disparity);
      }
    }

    return results;
  }

  /**
   * Run counterfactual fairness tests
   * @param {Object} modelAdapter - Model adapter instance
   * @param {Array} counterfactuals - Counterfactual test pairs
   * @returns {Object} Counterfactual test results
   */
  async runCounterfactualTests(modelAdapter, counterfactuals) {
    const results = {
      pairs: [],
      consistencyScore: 0
    };

    for (const pair of counterfactuals) {
      const original = await modelAdapter.getPrediction(pair.original);
      const counterfactual = await modelAdapter.getPrediction(pair.counterfactual);

      results.pairs.push({
        original: {
          text: pair.original,
          prediction: original.confidence > 0.5 ? 1 : 0
        },
        counterfactual: {
          text: pair.counterfactual,
          prediction: counterfactual.confidence > 0.5 ? 1 : 0
        },
        isConsistent: original.confidence > 0.5 === counterfactual.confidence > 0.5
      });
    }

    // Calculate overall consistency
    results.consistencyScore = results.pairs.filter(p => p.isConsistent).length /
      results.pairs.length;

    return results;
  }

  /**
   * Run the bias test
   * @param {Object} modelAdapter - Model adapter instance
   * @returns {Object} Test results
   */
  async run(modelAdapter) {
    try {
      await this.setup();
      this.log('Starting text classification bias test');

      // Load test cases
      const testCases = await this.loadTestCases();
      const results = {
        weat: null,
        demographicParity: null,
        counterfactual: null,
        overallBias: 0
      };

      // Run WEAT tests if enabled
      if (this.params.useWeatTests && testCases.weatTests) {
        this.log('Running WEAT tests');
        results.weat = await this.runWEATTests(modelAdapter, testCases.weatTests);
      }

      // Run demographic parity tests
      this.log('Running demographic parity tests');
      results.demographicParity = await this.runDemographicParityTests(
        modelAdapter,
        testCases.demographicParity
      );

      // Run counterfactual tests
      this.log('Running counterfactual fairness tests');
      results.counterfactual = await this.runCounterfactualTests(
        modelAdapter,
        testCases.counterfactuals
      );

      // Calculate overall bias score
      results.overallBias = (
        (results.weat?.overallBias || 0) +
        results.demographicParity.maxDisparity +
        (1 - results.counterfactual.consistencyScore)
      ) / 3;

      // Determine test status
      this.status = results.overallBias <= this.params.disparityThreshold ?
        TEST_STATUS.PASSED : TEST_STATUS.FAILED;

      this.results = {
        ...results,
        disparityThreshold: this.params.disparityThreshold,
        isPassing: this.status === TEST_STATUS.PASSED
      };

      // Save test results
      await this.dataManager.saveTestResults(
        NLP_TEST_CATEGORIES.BIAS_FAIRNESS,
        this.id,
        this.results
      );

      this.log(`Test completed with status: ${this.status}`);
      return this.getReport();

    } catch (error) {
      this.error = error;
      this.status = TEST_STATUS.ERROR;
      this.log(`Test failed with error: ${error.message}`);
      throw error;
    } finally {
      await this.teardown();
    }
  }
} 