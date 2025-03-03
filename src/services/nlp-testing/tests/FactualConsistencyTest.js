/**
 * Factual Consistency Test
 */

import { BaseTest } from './BaseTest';
import { NLP_TEST_CATEGORIES, NLP_MODEL_TYPES, TEST_STATUS } from '../types';
import { MetricsService } from '../metrics/MetricsService';
import { TestDataManager } from '../data/TestDataManager';

export class FactualConsistencyTest extends BaseTest {
  constructor(config = {}) {
    super({
      ...config,
      name: 'Factual Consistency Test',
      description: 'Tests model outputs for factual consistency and hallucination detection',
      category: NLP_TEST_CATEGORIES.FACTUAL_CONSISTENCY,
      modelType: config.modelType || NLP_MODEL_TYPES.TEXT_GENERATION
    });

    this.params = {
      ...this.params,
      consistencyThreshold: config.params?.consistencyThreshold || 0.7,
      truthfulnessThreshold: config.params?.truthfulnessThreshold || 0.8,
      useTruthfulQA: config.params?.useTruthfulQA || true,
      useFactCC: config.params?.useFactCC || true,
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

    const factualData = await this.dataManager.getFactualTestData();
    return {
      truthfulQA: factualData.truthfulQA,
      factCC: factualData.factCC,
      customFacts: factualData.customFacts
    };
  }

  /**
   * Run TruthfulQA benchmark tests
   * @param {Object} modelAdapter - Model adapter instance
   * @param {Array} truthfulQA - TruthfulQA test cases
   * @returns {Object} TruthfulQA test results
   */
  async runTruthfulQATests(modelAdapter, truthfulQA) {
    const results = {
      questions: [],
      overallTruthfulness: 0,
      categories: {}
    };

    for (const question of truthfulQA) {
      // Get model's answer
      const response = await modelAdapter.getPrediction(question.question);
      
      // Compare with reference answers
      const truthfulnessScores = [];
      for (const reference of question.correct_answers) {
        const score = await this.metricsService.calculateFactualConsistency(
          response.text,
          reference
        );
        truthfulnessScores.push(score.entailmentScore);
      }

      // Check for presence of known false statements
      const falsehoodScores = [];
      for (const falsehood of question.incorrect_answers) {
        const score = await this.metricsService.calculateFactualConsistency(
          response.text,
          falsehood
        );
        falsehoodScores.push(score.contradictionScore);
      }

      const result = {
        question: question.question,
        response: response.text,
        truthfulnessScore: Math.max(...truthfulnessScores),
        falsehoodScore: Math.max(...falsehoodScores),
        category: question.category,
        isAccurate: Math.max(...truthfulnessScores) > this.params.truthfulnessThreshold &&
                   Math.max(...falsehoodScores) < (1 - this.params.truthfulnessThreshold)
      };

      results.questions.push(result);

      // Track category-specific results
      if (!results.categories[question.category]) {
        results.categories[question.category] = {
          total: 0,
          accurate: 0
        };
      }
      results.categories[question.category].total++;
      if (result.isAccurate) {
        results.categories[question.category].accurate++;
      }
    }

    // Calculate overall truthfulness
    results.overallTruthfulness = results.questions.filter(q => q.isAccurate).length /
      results.questions.length;

    // Calculate category-specific accuracy
    for (const category of Object.values(results.categories)) {
      category.accuracy = category.accurate / category.total;
    }

    return results;
  }

  /**
   * Run FactCC benchmark tests
   * @param {Object} modelAdapter - Model adapter instance
   * @param {Array} factCC - FactCC test cases
   * @returns {Object} FactCC test results
   */
  async runFactCCTests(modelAdapter, factCC) {
    const results = {
      cases: [],
      overallConsistency: 0,
      errorTypes: {
        intrinsic: { count: 0, examples: [] },
        extrinsic: { count: 0, examples: [] },
        semantic: { count: 0, examples: [] }
      }
    };

    for (const testCase of factCC) {
      // Get model's generated text
      const response = await modelAdapter.getPrediction(testCase.input);
      
      // Calculate consistency scores
      const consistencyScore = await this.metricsService.calculateFactualConsistency(
        response.text,
        testCase.source
      );

      const result = {
        input: testCase.input,
        source: testCase.source,
        response: response.text,
        ...consistencyScore,
        isConsistent: consistencyScore.entailmentScore >= this.params.consistencyThreshold
      };

      // Analyze error types if inconsistent
      if (!result.isConsistent) {
        const errorType = this.analyzeErrorType(
          testCase.source,
          response.text,
          testCase.annotations
        );
        results.errorTypes[errorType].count++;
        results.errorTypes[errorType].examples.push({
          source: testCase.source,
          generated: response.text,
          error: errorType
        });
      }

      results.cases.push(result);
    }

    // Calculate overall consistency
    results.overallConsistency = results.cases.filter(c => c.isConsistent).length /
      results.cases.length;

    return results;
  }

  /**
   * Analyze type of factual error
   * @param {string} source - Source text
   * @param {string} generated - Generated text
   * @param {Object} annotations - Error annotations
   * @returns {string} Error type
   */
  analyzeErrorType(source, generated, annotations) {
    // Intrinsic errors: internal contradictions
    if (this.hasInternalContradictions(generated)) {
      return 'intrinsic';
    }
    
    // Extrinsic errors: contradictions with source
    if (this.contradictionsWithSource(source, generated)) {
      return 'extrinsic';
    }
    
    // Semantic errors: meaning-changing alterations
    return 'semantic';
  }

  /**
   * Check for internal contradictions
   * @param {string} text - Text to analyze
   * @returns {boolean} Whether text contains internal contradictions
   */
  hasInternalContradictions(text) {
    const statements = this.extractKeyStatements(text);
    for (let i = 0; i < statements.length; i++) {
      for (let j = i + 1; j < statements.length; j++) {
        const consistency = this.metricsService.calculateFactualConsistency(
          statements[i],
          statements[j]
        );
        if (consistency.contradictionScore > 0.7) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check for contradictions with source
   * @param {string} source - Source text
   * @param {string} generated - Generated text
   * @returns {boolean} Whether generated text contradicts source
   */
  contradictionsWithSource(source, generated) {
    const sourceStatements = this.extractKeyStatements(source);
    const generatedStatements = this.extractKeyStatements(generated);

    for (const sourceStmt of sourceStatements) {
      for (const generatedStmt of generatedStatements) {
        const consistency = this.metricsService.calculateFactualConsistency(
          generatedStmt,
          sourceStmt
        );
        if (consistency.contradictionScore > 0.7) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extract key statements from text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of key statements
   */
  extractKeyStatements(text) {
    // Split text into sentences
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Filter for statements containing factual content
    return sentences.filter(sentence => {
      const hasNumbers = /\d+/.test(sentence);
      const hasNames = /[A-Z][a-z]+/.test(sentence);
      const hasFactualWords = /(is|are|was|were|contains|consists|located|composed|discovered|invented|founded)\b/.test(sentence);
      
      return hasNumbers || hasNames || hasFactualWords;
    });
  }

  /**
   * Run the factual consistency test
   * @param {Object} modelAdapter - Model adapter instance
   * @returns {Object} Test results
   */
  async run(modelAdapter) {
    try {
      await this.setup();
      this.log('Starting factual consistency test');

      // Load test cases
      const testCases = await this.loadTestCases();
      const results = {
        truthfulQA: null,
        factCC: null,
        customFacts: null,
        overallAccuracy: 0
      };

      // Run TruthfulQA tests if enabled
      if (this.params.useTruthfulQA && testCases.truthfulQA) {
        this.log('Running TruthfulQA benchmark tests');
        results.truthfulQA = await this.runTruthfulQATests(
          modelAdapter,
          testCases.truthfulQA
        );
      }

      // Run FactCC tests if enabled
      if (this.params.useFactCC && testCases.factCC) {
        this.log('Running FactCC benchmark tests');
        results.factCC = await this.runFactCCTests(
          modelAdapter,
          testCases.factCC
        );
      }

      // Calculate overall accuracy
      let scores = [];
      if (results.truthfulQA) {
        scores.push(results.truthfulQA.overallTruthfulness);
      }
      if (results.factCC) {
        scores.push(results.factCC.overallConsistency);
      }

      results.overallAccuracy = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Determine test status
      this.status = results.overallAccuracy >= this.params.consistencyThreshold ?
        TEST_STATUS.PASSED : TEST_STATUS.FAILED;

      this.results = {
        ...results,
        consistencyThreshold: this.params.consistencyThreshold,
        truthfulnessThreshold: this.params.truthfulnessThreshold,
        isPassing: this.status === TEST_STATUS.PASSED
      };

      // Save test results
      await this.dataManager.saveTestResults(
        NLP_TEST_CATEGORIES.FACTUAL_CONSISTENCY,
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